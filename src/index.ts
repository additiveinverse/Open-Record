import {
  ErrorHandler,
  HandlerInput,
  RequestHandler,
  SkillBuilders,
} from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { buildMarkdown, recordPath } from "./markdown";
import { uploadRecord } from "./onedrive";
import { ACKS, LISTENING, REPROMPTS, SAVED, pick } from "./phrases";

const TIME_ZONE = process.env.TZ_NAME ?? "America/Chicago";

interface Attrs {
  buffer?: string[];
  topic?: string;
  awaitingFinalTopic?: boolean;
}

function getBuffer(input: HandlerInput): string[] {
  const attrs = input.attributesManager.getSessionAttributes() as Attrs;
  return attrs.buffer ?? [];
}

function setBuffer(input: HandlerInput, buffer: string[]): void {
  const attrs = input.attributesManager.getSessionAttributes() as Attrs;
  input.attributesManager.setSessionAttributes({ ...attrs, buffer });
}

function formatSpokenCommands(text: string): string {
  return text
    .replace(/\s*\bperiod\b\s*/gi, ". ")
    .replace(/\s*\bexclamation\b\s*/gi, "!!! ")
    .replace(/\s*\b(?:new\s*line|next line)\b\s*/gi, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function deviceName(input: HandlerInput): string {
  const id = input.requestEnvelope.context.System.device?.deviceId ?? "unknown";
  const map: Record<string, string> = JSON.parse(process.env.DEVICE_NAMES ?? "{}");
  return map[id] ?? id;
}

// Returns true if something was saved; clears the buffer either way it succeeds.
async function flush(input: HandlerInput): Promise<boolean> {
  const buffer = getBuffer(input);
  if (buffer.length === 0) return false;
  const now = new Date();
  const content = buildMarkdown({
    date: now,
    timeZone: TIME_ZONE,
    device: deviceName(input),
    text: buffer.join("\n\n"),
    topic: (input.attributesManager.getSessionAttributes() as Attrs).topic,
  });
  await uploadRecord(recordPath(now, TIME_ZONE), content);
  setBuffer(input, []);
  return true;
}

async function saveAndEnd(input: HandlerInput): Promise<Response> {
  const rb = input.responseBuilder;
  try {
    const saved = await flush(input);
    return rb.speak(saved ? SAVED : "Nothing to save.").withShouldEndSession(true).getResponse();
  } catch (err) {
    console.error("save failed", err);
    return rb
      .speak("I couldn't save that record.")
      .withShouldEndSession(true)
      .getResponse();
  }
}

const isIntent = (input: HandlerInput, name: string) =>
  input.requestEnvelope.request.type === "IntentRequest" &&
  input.requestEnvelope.request.intent.name === name;

const LaunchHandler: RequestHandler = {
  canHandle: (i) => i.requestEnvelope.request.type === "LaunchRequest",
  handle(i) {
    i.attributesManager.setSessionAttributes({ buffer: [] });
    return i.responseBuilder
      .speak(`${LISTENING} ${pick(ACKS)}`)
      .reprompt(pick(REPROMPTS))
      .getResponse();
  },
};

const TopicHandler: RequestHandler = {
  canHandle: (i) => isIntent(i, "TopicIntent"),
  handle(i) {
    const request = i.requestEnvelope.request;
    if (request.type !== "IntentRequest") throw new Error("unreachable");
    const topic = request.intent.slots?.topic?.value?.trim();
    if (!topic) {
      return i.responseBuilder
        .speak("Say topic followed by the topic name.")
        .reprompt("Say topic followed by the topic name.")
        .getResponse();
    }
    const attrs = i.attributesManager.getSessionAttributes() as Attrs;
    i.attributesManager.setSessionAttributes({ ...attrs, topic, awaitingFinalTopic: false });
    if (attrs.awaitingFinalTopic) return saveAndEnd(i);
    return i.responseBuilder.speak("Topic set. Go ahead.").reprompt(pick(REPROMPTS)).getResponse();
  },
};

const TopicPromptHandler: RequestHandler = {
  canHandle: (i) => isIntent(i, "TopicPromptIntent"),
  handle: (i) => i.responseBuilder
    .speak("Say topic followed by the topic name.")
    .reprompt("Say topic followed by the topic name.")
    .getResponse(),
};

const CaptureHandler: RequestHandler = {
  canHandle: (i) => isIntent(i, "CaptureIntent") || isIntent(i, "FirstPersonCaptureIntent"),
  handle(i) {
    const request = i.requestEnvelope.request;
    if (request.type !== "IntentRequest") throw new Error("unreachable");
    const rawText = request.intent.slots?.text?.value;
    const firstPerson = request.intent.name === "FirstPersonCaptureIntent";
    const restoredText = rawText && firstPerson && !/^i\b/i.test(rawText) ? `I ${rawText}` : rawText;
    const spoken = restoredText ? formatSpokenCommands(restoredText) : "";
    if (spoken) {
      setBuffer(i, [...getBuffer(i), spoken]);
    }
    return i.responseBuilder
      .speak(pick(ACKS))
      .reprompt(pick(REPROMPTS))
      .getResponse();
  },
};

const EndRecordHandler: RequestHandler = {
  canHandle: (i) =>
    isIntent(i, "EndRecordIntent") ||
    isIntent(i, "AMAZON.StopIntent") ||
    isIntent(i, "AMAZON.CancelIntent"),
  handle(i) {
    if (!isIntent(i, "EndRecordIntent")) return saveAndEnd(i);
    const attrs = i.attributesManager.getSessionAttributes() as Attrs;
    if (attrs.topic || getBuffer(i).length === 0) return saveAndEnd(i);
    i.attributesManager.setSessionAttributes({ ...attrs, awaitingFinalTopic: true });
    return i.responseBuilder
      .speak("Add a topic? Say no, or say topic followed by a name.")
      .reprompt("Say no, or say topic followed by a name.")
      .getResponse();
  },
};

const NoIntentHandler: RequestHandler = {
  canHandle: (i) => isIntent(i, "AMAZON.NoIntent"),
  handle(i) {
    const attrs = i.attributesManager.getSessionAttributes() as Attrs;
    if (attrs.awaitingFinalTopic) return saveAndEnd(i);
    return i.responseBuilder.speak("Okay. Go ahead.").reprompt(pick(REPROMPTS)).getResponse();
  },
};

const HelpHandler: RequestHandler = {
  canHandle: (i) => isIntent(i, "AMAZON.HelpIntent"),
  handle: (i) =>
    i.responseBuilder
      .speak("Go ahead and speak. Say topic followed by a name to set one, or end record when you're done.")
      .reprompt(pick(REPROMPTS))
      .getResponse(),
};

// Alexa gives the fallback intent no text, so the utterance is unrecoverable here.
const FallbackHandler: RequestHandler = {
  canHandle: (i) => isIntent(i, "AMAZON.FallbackIntent") || isIntent(i, "AMAZON.NavigateHomeIntent"),
  handle: (i) =>
    i.responseBuilder
      .speak("Sorry, I missed that. Go ahead.")
      .reprompt(pick(REPROMPTS))
      .getResponse(),
};

const SessionEndedHandler: RequestHandler = {
  canHandle: (i) => i.requestEnvelope.request.type === "SessionEndedRequest",
  async handle(i) {
    try {
      await flush(i);
    } catch (err) {
      console.error("flush on session end failed", err);
    }
    return i.responseBuilder.getResponse();
  },
};

const ErrorHandlerImpl: ErrorHandler = {
  canHandle: () => true,
  async handle(i, error) {
    console.error("unhandled error", error);
    return saveAndEnd(i);
  },
};

export const handler = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchHandler,
    TopicHandler,
    TopicPromptHandler,
    CaptureHandler,
    EndRecordHandler,
    NoIntentHandler,
    HelpHandler,
    FallbackHandler,
    SessionEndedHandler,
  )
  .addErrorHandlers(ErrorHandlerImpl)
  .lambda();
