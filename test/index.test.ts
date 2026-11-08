import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestEnvelope, ResponseEnvelope } from "ask-sdk-model";

const uploadRecord = vi.hoisted(() => vi.fn());
vi.mock("../src/onedrive", () => ({ uploadRecord }));

import { handler } from "../src/index";

type SessionAttributes = Record<string, unknown>;

function invoke(request: object, attributes: SessionAttributes = {}): Promise<ResponseEnvelope> {
  const envelope = {
    version: "1.0",
    session: {
      new: false,
      sessionId: "session",
      application: { applicationId: "skill" },
      user: { userId: "user" },
      attributes,
    },
    context: {
      System: {
        application: { applicationId: "skill" },
        user: { userId: "user" },
        device: { deviceId: "device", supportedInterfaces: {} },
      },
    },
    request: { requestId: "request", timestamp: "2026-11-07T12:00:00Z", locale: "en-US", ...request },
  } as RequestEnvelope;
  return new Promise((resolve, reject) => {
    handler(envelope, {}, (error, result) => error ? reject(error) : resolve(result));
  });
}

function intent(name: string, slotName?: string, value?: string): object {
  return {
    type: "IntentRequest",
    intent: { name, slots: slotName ? { [slotName]: { name: slotName, value } } : {} },
  };
}

describe("Alexa capture", () => {
  beforeEach(() => {
    uploadRecord.mockReset().mockResolvedValue(undefined);
  });

  it("saves the spoken topic and keeps it across captured turns", async () => {
    const launch = await invoke({ type: "LaunchRequest" });
    expect(launch.sessionAttributes).toEqual({ buffer: [] });
    const topic = await invoke(intent("TopicIntent", "topic", "Field Notes"), launch.sessionAttributes);
    const capture = await invoke(intent("CaptureIntent", "text", "a first thought"), topic.sessionAttributes);
    const second = await invoke(intent("CaptureIntent", "text", "another thought"), capture.sessionAttributes);
    const end = await invoke(intent("EndRecordIntent"), second.sessionAttributes);

    expect(uploadRecord).toHaveBeenCalledOnce();
    expect(uploadRecord.mock.calls[0][1]).toContain("topic: Field Notes\n");
    expect(uploadRecord.mock.calls[0][1]).toContain("a first thought\n\nanother thought\n\n[[Field Notes]]");
    expect(end.response.shouldEndSession).toBe(true);
  });

  it("accepts the first thought immediately after launch", async () => {
    const launch = await invoke({ type: "LaunchRequest" });
    const capture = await invoke(intent("FirstPersonCaptureIntent", "text", "think this is a fragment"), launch.sessionAttributes);

    expect(capture.sessionAttributes).toMatchObject({ buffer: ["I think this is a fragment"] });
  });

  it("can set a topic after dictation and saves it when the session ends", async () => {
    const capture = await invoke(intent("CaptureIntent", "text", "a thought"));
    const topic = await invoke(intent("TopicIntent", "topic", "Ideas"), capture.sessionAttributes);
    await invoke({ type: "SessionEndedRequest", reason: "USER_INITIATED" }, topic.sessionAttributes);

    expect(uploadRecord.mock.calls[0][1]).toContain("topic: Ideas\n");
    expect(uploadRecord.mock.calls[0][1]).toContain("a thought\n\n[[Ideas]]");
  });

  it("asks whether to add a topic before saving to Inbox", async () => {
    const capture = await invoke(intent("CaptureIntent", "text", "a thought"));
    const end = await invoke(intent("EndRecordIntent"), capture.sessionAttributes);
    expect(uploadRecord).not.toHaveBeenCalled();
    expect(end.response.outputSpeech).toMatchObject({ type: "SSML", ssml: expect.stringContaining("Add a topic") });

    await invoke(intent("AMAZON.NoIntent"), end.sessionAttributes);

    expect(uploadRecord.mock.calls[0][1]).toContain("topic: Inbox\n");
  });

  it("saves the current record when Alexa Stop ends the session", async () => {
    const capture = await invoke(intent("CaptureIntent", "text", "a thought"));
    const stopped = await invoke(intent("AMAZON.StopIntent"), capture.sessionAttributes);

    expect(uploadRecord.mock.calls[0][1]).toContain("a thought\n\n[[Inbox]]");
    expect(stopped.response.shouldEndSession).toBe(true);
  });

  it("explains how to retry when Alexa cannot match a capture utterance", async () => {
    const fallback = await invoke(intent("AMAZON.FallbackIntent"));

    expect(fallback.response.outputSpeech).toMatchObject({
      type: "SSML",
      ssml: expect.stringContaining("Try again starting with I, okay, all right, or note"),
    });
    expect(uploadRecord).not.toHaveBeenCalled();
  });

  it("sets the optional topic at the end and saves immediately", async () => {
    const capture = await invoke(intent("CaptureIntent", "text", "a thought"));
    const end = await invoke(intent("EndRecordIntent"), capture.sessionAttributes);
    await invoke(intent("TopicIntent", "topic", "Ideas"), end.sessionAttributes);

    expect(uploadRecord.mock.calls[0][1]).toContain("topic: Ideas\n");
    expect(uploadRecord.mock.calls[0][1]).toContain("a thought\n\n[[Ideas]]");
  });

  it("turns newline and next line commands into single line breaks", async () => {
    const capture = await invoke(
      intent("CaptureIntent", "text", "thought one newline thought two next line thought three"),
    );
    const end = await invoke(intent("EndRecordIntent"), capture.sessionAttributes);
    await invoke(intent("AMAZON.NoIntent"), end.sessionAttributes);

    expect(uploadRecord.mock.calls[0][1]).toContain("thought one\nthought two\nthought three\n\n[[Inbox]]");
  });

  it("turns spoken period and exclamation commands into punctuation", async () => {
    const capture = await invoke(
      intent("CaptureIntent", "text", "thought one period next thought exclamation newline last thought period"),
    );
    const end = await invoke(intent("EndRecordIntent"), capture.sessionAttributes);
    await invoke(intent("AMAZON.NoIntent"), end.sessionAttributes);

    expect(uploadRecord.mock.calls[0][1]).toContain("thought one. next thought!!!\nlast thought.\n\n[[Inbox]]");
  });

  it("restores a leading I removed as the intent carrier", async () => {
    const capture = await invoke(intent("FirstPersonCaptureIntent", "text", "think this is a fragment"));
    const end = await invoke(intent("EndRecordIntent"), capture.sessionAttributes);
    await invoke(intent("AMAZON.NoIntent"), end.sessionAttributes);

    expect(uploadRecord.mock.calls[0][1]).toContain("I think this is a fragment\n\n[[Inbox]]");
  });

  it("prompts for a topic command without losing the existing buffer", async () => {
    const capture = await invoke(intent("CaptureIntent", "text", "a thought"));
    const prompt = await invoke(intent("TopicPromptIntent"), capture.sessionAttributes);
    const empty = await invoke(intent("TopicIntent", "topic"), prompt.sessionAttributes);

    expect(empty.sessionAttributes).toEqual({ buffer: ["a thought"] });
    expect(empty.response.outputSpeech).toMatchObject({ type: "SSML", ssml: expect.stringContaining("Say topic followed") });
  });
});