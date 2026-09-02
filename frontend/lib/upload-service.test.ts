import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadToPresignedPost } from "./upload-service";

type EventListener = (event?: unknown) => void;

class FakeEventTarget {
  private listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(type: string, event?: unknown) {
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

class FakeXMLHttpRequest extends FakeEventTarget {
  static latest: FakeXMLHttpRequest | undefined;

  readonly upload = new FakeEventTarget();
  status = 201;
  method = "";
  url = "";
  withCredentials = true;
  body: FormData | null = null;

  constructor() {
    super();
    FakeXMLHttpRequest.latest = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: FormData) {
    this.body = body;
    this.upload.dispatchEvent("progress", {
      lengthComputable: true,
      loaded: 1,
      total: 2,
    });
    this.dispatchEvent("load");
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeXMLHttpRequest.latest = undefined;
});

describe("uploadToPresignedPost", () => {
  it("uploads form fields without forwarding application credentials", async () => {
    vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);
    const progress = vi.fn();
    const file = new Blob(["material"], { type: "application/pdf" }) as File;

    await uploadToPresignedPost(
      {
        url: "https://uploads.example.test/material",
        fields: {
          key: "object-key",
          policy: "policy",
        },
      },
      file,
      progress,
    );

    const request = FakeXMLHttpRequest.latest;
    expect(request).toBeDefined();
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://uploads.example.test/material");
    expect(request?.withCredentials).toBe(false);
    expect(request?.body?.get("key")).toBe("object-key");
    expect(request?.body?.get("policy")).toBe("policy");
    expect(request?.body?.get("file")).toBeInstanceOf(Blob);
    expect(progress).toHaveBeenLastCalledWith(100);
  });
});
