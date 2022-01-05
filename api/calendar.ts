import { exec, init, InitProps } from "./fetch.ts";
import { formatRFC3339 } from "../deps/date-fns.ts";

export function initialize(props: Omit<InitProps, "scopes">) {
  init({
    ...props,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
}

/** 置換するcalendar eventsの範囲を決めるためのparameters */
export interface ReplaceEventsInit {
  /** eventの取得先project */ project: string;
  /** eventの取得先ページタイトル */ title: string;
}
/** 特定の条件に一致したcalendar eventsを置換する
 *
 * @param calendarId - calendar eventsの登録先calendarのID
 * @param events - 置換したいcalendar events
 */
export async function replaceEvents(
  calendarId: string,
  events: EventOptions[],
  init: ReplaceEventsInit,
) {
  // projectとtitleが一致する予定を検索する
  const existEvents = await searchEvents(calendarId, {
    private: { ...init },
  });

  // 既存のeventも新規作成するeventもなければ何もしない
  if (events.length === 0 && existEvents.length === 0) return;

  // 以前登録したeventsを更新する
  const newEvents = [] as typeof events;
  await Promise.all(events.map(async (event) => {
    const index = existEvents.findIndex(({ extendedProperties }) =>
      event.id === extendedProperties.private?.id
    );
    if (index < 0) {
      // 新規作成するevent
      newEvents.push(event);
      return;
    }

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
    await updateEvent(calendarId, oldEvent.id, { ...event, ...init });
  }));

  // 紐付けられていないeventは、新しいeventと紐付ける
  if (existEvents.length >= newEvents.length) {
    await Promise.all(
      newEvents.map((event, i) =>
        updateEvent(calendarId, existEvents[i].id, { ...event, ...init })
      ),
    );
    // 不要なeventを削除する
    // DELETEは叩きすぎるとエラーになるので、一つづつ叩く
    for (let i = newEvents.length; i < existEvents.length; i++) {
      await deleteEvent(calendarId, existEvents[i].id);
    }
  } else {
    await Promise.all(
      newEvents.map((event, i) =>
        i < existEvents.length
          ? updateEvent(calendarId, existEvents[i].id, { ...event, ...init })
          : createEvent(calendarId, { ...event, ...init }) // 足りない分は新規作成する
      ),
    );
  }
}

/** 登録したいcalendar eventの設定値 */
export interface EventOptions {
  /** calendar eventの名前 */ summary: Event["summary"];
  /** calendar eventの開始日時 */ start: Date;
  /** calendar eventの終了日時 */ end: Date;
  /** calendar eventの取得先URL */ source: Event["source"];
  /** 同値比較用ID */ id: string;
}

/** 新しいcalendar eventを登録する
 *
 * @param calendarId 登録先calendarのID
 */
async function createEvent(
  calendarId: string,
  { start, end, id, project, title, ...rest }: EventOptions & ReplaceEventsInit,
) {
  const res = await exec(
    `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: { dateTime: formatRFC3339(start, {}) },
        end: { dateTime: formatRFC3339(end, {}) },
        extendedProperties: {
          private: {
            project,
            title,
            id,
          },
        },
        ...rest,
      }),
    },
  );
  return (await res.json()) as Event;
}

async function updateEvent(
  calendarId: string,
  eventId: string,
  { start, end, id, project, title, ...rest }: EventOptions & ReplaceEventsInit,
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
        start: { dateTime: formatRFC3339(start, {}) },
        end: { dateTime: formatRFC3339(end, {}) },
        extendedProperties: {
          private: {
            project,
            title,
            id,
          },
        },
        ...rest,
      }),
    },
  );
  return (await res.json()) as Event;
}

/** calendar eventを削除する
 *
 * @param calendarId 削除したいeventの登録先calendarのID
 * @param eventId 削除したいeventのID
 */
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

/** calendar eventに登録できる拡張properties */
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
  /** 見つかったcalendar events */ items: Event[];
  nextSyncToken?: string;
}

/** 指定した拡張propertiesを持つcalendar eventsを検索する
 *
 * @param calendarId このIDが指定するcalendarの中を検索する
 * @param extendedProperties 検索に使う拡張properties
 */
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
