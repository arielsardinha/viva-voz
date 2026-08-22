import {
  notifyLibraryChanged,
  notifySyncCompleted,
  notifySettingsChanged,
  VIVAVOZ_LIBRARY_CHANGED_EVENT,
  VIVAVOZ_SYNC_COMPLETED_EVENT,
  VIVAVOZ_SETTINGS_CHANGED_EVENT,
} from "./sync-events";

describe("Sync Events Bus", () => {
  it("deve despachar evento VIVAVOZ_LIBRARY_CHANGED_EVENT", () => {
    const handler = jest.fn();
    window.addEventListener(VIVAVOZ_LIBRARY_CHANGED_EVENT, handler);

    notifyLibraryChanged("test_reason");

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.reason).toBe("test_reason");
    expect(typeof event.detail.timestamp).toBe("number");

    window.removeEventListener(VIVAVOZ_LIBRARY_CHANGED_EVENT, handler);
  });

  it("deve despachar evento VIVAVOZ_SYNC_COMPLETED_EVENT e notificar alteração na biblioteca", () => {
    const syncHandler = jest.fn();
    const libraryHandler = jest.fn();

    window.addEventListener(VIVAVOZ_SYNC_COMPLETED_EVENT, syncHandler);
    window.addEventListener(VIVAVOZ_LIBRARY_CHANGED_EVENT, libraryHandler);

    notifySyncCompleted({
      action: "bidirectional",
      importedCount: 2,
      updatedCount: 1,
      timestamp: Date.now(),
    });

    expect(syncHandler).toHaveBeenCalledTimes(1);
    expect(libraryHandler).toHaveBeenCalledTimes(1);

    const syncEvent = syncHandler.mock.calls[0][0] as CustomEvent;
    expect(syncEvent.detail.action).toBe("bidirectional");
    expect(syncEvent.detail.importedCount).toBe(2);

    window.removeEventListener(VIVAVOZ_SYNC_COMPLETED_EVENT, syncHandler);
    window.removeEventListener(VIVAVOZ_LIBRARY_CHANGED_EVENT, libraryHandler);
  });

  it("deve despachar evento VIVAVOZ_SETTINGS_CHANGED_EVENT", () => {
    const handler = jest.fn();
    window.addEventListener(VIVAVOZ_SETTINGS_CHANGED_EVENT, handler);

    notifySettingsChanged({ theme: "dark" });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.settings).toEqual({ theme: "dark" });

    window.removeEventListener(VIVAVOZ_SETTINGS_CHANGED_EVENT, handler);
  });
});
