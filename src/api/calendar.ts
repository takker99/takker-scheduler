import { exec, init, InitProps } from "./fetch.ts";
import { formatRFC3339 } from "../deps/date-fns.ts";

export function initialize(props: Omit<InitProps, "scopes">) {
  init({
    ...props,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
}

export async function replaceEvents(
  calendarId: string,
  events,
  { project, title },
) {
  // projectとtitleが一致する予定を検索する
  const existEvents = await searchEvents(calendarId, {
    private: { project, title },
  });

  // 既存の予定も新規作成する予定もなければ何もしない
  if (events.length === 0 && existEvents.length === 0) return;

  // 新しい予定を書き込む
  await Promise.all(events.map((event) => {
    const index = existEvents.findIndex(({ extendedProperties }) =>
      event.extendedProperties.private.project ===
        extendedProperties.private.project &&
      event.extendedProperties.private.title ===
        extendedProperties.private.title &&
      event.extendedProperties.private.id === extendedProperties.private.id
    );
    if (index > -1) {
      const oldEvent = existEvents[index];
      // 紐付けられているとわかったeventはどんどん削っていく
      existEvents.splice(index, 1);
      // 変更がなければ何もしない
      if (
        oldEvent.summary === event.summary &&
        oldEvent.start.dateTime === formatRFC3339(event.start) &&
        oldEvent.end.dateTime === formatRFC3339(event.end)
      ) {
        return;
      }
      return updateEvent(calendarId, oldEvent.id, event);
    }
    return createEvent(calendarId, event);
  }));

  // 紐付けられていない予定をすべて消す
  console.log("Delete ", existEvents);
  for (const { id } of existEvents) {
    await deleteEvent(calendarId, id);
  }
}

async function createEvent(
  calendarId: string,
  { summary, start, end }: EventOptions,
) {
  const res = await exec(
    `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        start: { dateTime: formatRFC3339(start, {}) },
        end: { dateTime: formatRFC3339(end, {}) },
      }),
    },
  );
  return (await res.json()) as Event;
}
export interface EventOptions {
  summary: string;
  start: Date;
  end: Date;
}
async function updateEvent(
  calendarId: string,
  eventId: string,
  { summary, start, end }: EventOptions,
) {
  const res = await exec(
    `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${
      encodeURIComponent(eventId)
    }`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        start: { dateTime: formatRFC3339(start, {}) },
        end: { dateTime: formatRFC3339(end, {}) },
      }),
    },
  );
  return (await res.json()) as Event;
}

async function deleteEvent(calendarId: string, eventId: string) {
  await exec(
    `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${
      encodeURIComponent(eventId)
    }`,
    {
      method: "DELETE",
    },
  );
}

export interface ExtendedProperties {
  private?: Record<string, string>;
  shared?: Record<string, string>;
}

export interface Event {
  kind: "calendar#event";
  etag: string;
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator: User;
  organizer: User;
  start: Time;
  end: Time;
  endTimeUnspecified: boolean;
  recurrence: string[];
  recurringEventId: string;
  originalStartTime: Time;
  transparency?: "opaque" | "transparent";
  visibility?: "default" | "public" | "private" | "confidential";
  iCalUID: string;
  sequence: number;
  attendees: Attendee[];
  attendeesOmitted?: boolean;
  extendedProperties: ExtendedProperties;
  hangoutLink: string;
  conferenceData: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: ConferenceSolutionKey;
      status: {
        statusCode: "pending" | "success" | "failure";
      };
    };
    entryPoints: EntryPoint[];
    conferenceSolution: {
      key: ConferenceSolutionKey;
      name: string;
      iconUri: string;
    };
    conferenceId?: string;
    signature?: string;
    notes?: string;
  };
  gadget: Gadget;
  anyoneCanAddSelf?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanModify: boolean;
  guestsCanSeeOtherGuests: boolean;
  privateCopy: boolean;
  locked: boolean;
  reminders: {
    useDefault: boolean;
    overrides: Reminder[];
  };
  source: {
    url: string;
    title: string;
  };
  attachments: Attachment[];
  eventType: "default" | "outOfOffice";
}
export interface Attachment {
  fileUrl: string;
  title: string;
  mimeType: string;
  iconLink: string;
  fileId: string;
}
export interface Attendee {
  id: string;
  email: string;
  displayName?: string;
  organizer: boolean;
  self: boolean;
  resource?: boolean;
  optional?: boolean;
  responseStatus: "needsAction" | "declined" | "tentative" | "accepted";
  comment?: string;
  additionalGuests?: number;
}
export interface ConferenceSolutionKey {
  type: "eventHangout" | "eventNamedHangout" | "hangoutsMeet" | "addOn";
}
export interface EntryPoint {
  entryPointType: "video" | "phone" | "sip" | "more";
  uri: string;
  label?: string;
  pin?: string;
  accessCode?: string;
  meetingCode?: string;
  passcode: string;
  password?: string;
}
export interface Gadget {
  type: string;
  title: string;
  link: string;
  iconLink: string;
  width?: number;
  height?: number;
  display: "icon" | "chip";
  preferences: Record<string, string>;
}
export interface Reminder {
  method: "email" | "popup";
  minutes: number;
}
export interface Time {
  date: string;
  dateTime: string;
  timeZone: string;
}
export interface User {
  id: string;
  email: string;
  displayName: string;
  self: boolean;
}
export interface SearchEventsResponse {
  kind: "calendar#events";
  etag: string;
  summary: string;
  description: string;
  updated: string;
  timeZone: string;
  accessRule: "none" | "freeBuzyReader" | "reader" | "writer" | "owner";
  defaultReminders: Reminder[];
  nextPageToken?: string;
  items: Event[];
  nextSyncToken?: string;
}
async function searchEvents(
  calendarId: string,
  extendedProperties: ExtendedProperties,
) {
  const params = new URLSearchParams();
  if (extendedProperties?.private) {
    for (const [key, value] of Object.entries(extendedProperties.private)) {
      params.append("privateExtendedProperty", `${key}=${value}`);
    }
  }
  if (extendedProperties?.shared) {
    for (const [key, value] of Object.entries(extendedProperties.shared)) {
      params.append("sharedExtendedProperty", `${key}=${value}`);
    }
  }

  const res = await exec(
    `/calendar/v3/calendars/${
      encodeURIComponent(calendarId)
    }/events?${params.toString()}`,
  );
  return ((await res.json()) as SearchEventsResponse).items;
}
