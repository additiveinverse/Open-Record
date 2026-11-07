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
    const topic = await invoke(intent("TopicIntent", "topic", "Field Notes"), launch.sessionAttributes);
    const capture = await invoke(intent("CaptureIntent", "text", "a first thought"), topic.sessionAttributes);
    const second = await invoke(intent("CaptureIntent", "text", "another thought"), capture.sessionAttributes);
    const end = await invoke(intent("EndRecordIntent"), second.sessionAttributes);

    expect(uploadRecord).toHaveBeenCalledOnce();
    expect(uploadRecord.mock.calls[0][1]).toContain("topic: Field Notes\n");
    expect(uploadRecord.mock.calls[0][1]).toContain("a first thought another thought\n\n[[Field Notes]]");
    expect(end.response.shouldEndSession).toBe(true);
  });

  it("can set a topic after dictation and saves it when the session ends", async () => {
    const capture = await invoke(intent("CaptureIntent", "text", "a thought"));
    const topic = await invoke(intent("TopicIntent", "topic", "Ideas"), capture.sessionAttributes);
    await invoke({ type: "SessionEndedRequest", reason: "USER_INITIATED" }, topic.sessionAttributes);

    expect(uploadRecord.mock.calls[0][1]).toContain("topic: Ideas\n");
    expect(uploadRecord.mock.calls[0][1]).toContain("a thought\n\n[[Ideas]]");
  });

  it("defaults to Inbox when no topic is set", async () => {
    const capture = await invoke(intent("CaptureIntent", "text", "a thought"));
    await invoke(intent("EndRecordIntent"), capture.sessionAttributes);

    expect(uploadRecord.mock.calls[0][1]).toContain("topic: Inbox\n");
  });

  it("prompts for a topic command without losing the existing buffer", async () => {
    const capture = await invoke(intent("CaptureIntent", "text", "a thought"));
    const prompt = await invoke(intent("TopicPromptIntent"), capture.sessionAttributes);
    const empty = await invoke(intent("TopicIntent", "topic"), prompt.sessionAttributes);

    expect(empty.sessionAttributes).toEqual({ buffer: ["a thought"] });
    expect(empty.response.outputSpeech).toMatchObject({ type: "SSML", ssml: expect.stringContaining("Say topic followed") });
  });
});