/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference types="https://raw.githubusercontent.com/proudust/deno-gas-types/main/mod.d.ts" />

import { formatRFC3339 } from "../deps/date-fns.ts";

/** 登録したいcalendar eventの設定値 */
export interface Event {
  /** calendar eventの名前 */ summary: string;
  /** calendar eventの開始日時 */ start: Date;
  /** calendar eventの終了日時 */ end: Date;
  /** calendar eventの取得先URL */ source: {
    title: string;
    url: string;
  };
  /** 同値比較用ID */ id: string;
}

export interface CreateEventInit {
  calendarId: string;
  project: string;
  title: string;
}
/** 新しいcalendar eventを登録する
 *
 * @param event 追加するevent
 * @param init その他の情報
 */
export function createEvent(
  event: Event,
  { calendarId, project, title }: CreateEventInit,
) {
  Calendar.Events?.insert?.(
    {
      start: { dateTime: formatRFC3339(event.start) },
      end: { dateTime: formatRFC3339(event.end) },
      extendedProperties: { private: { project, title, id: event.id } },
      summary: event.summary,
      source: event.source,
    },
    calendarId,
  );
}

export interface UpdateEventInit {
  calendarId: string;
  eventId: string;
  project: string;
  title: string;
}
/** calendar eventを更新する
 *
 * @param event 追加するevent
 * @param init その他の情報
 */
export function updateEvent(
  event: Event,
  { calendarId, eventId, project, title }: UpdateEventInit,
) {
  Calendar.Events?.patch?.(
    {
      start: { dateTime: formatRFC3339(event.start) },
      end: { dateTime: formatRFC3339(event.end) },
      extendedProperties: { private: { project, title, id: event.id } },
      summary: event.summary,
      source: event.source,
    },
    calendarId,
    eventId,
  );
}

/** calendar eventを削除する
 *
 * @param calendarId eventが登録されているcalendarのid
 * @param eventId 削除したいeventのid
 */
export function deleteEvent(
  calendarId: string,
  eventId: string,
) {
  Calendar.Events?.remove?.(calendarId, eventId);
}

/** 指定した拡張propertiesを持つcalendar eventsを検索する
 *
 * @param calendarId このIDが指定するcalendarの中を検索する
 * @param extendedProperties 検索に使う拡張properties
 */
export function search(
  calendarId: string,
  extendedProperties: GoogleAppsScript.Calendar.Schema.EventExtendedProperties,
): GoogleAppsScript.Calendar.Schema.Event[] {
  const privateExtendedProperty = [] as `${string}=${string}`[];
  if (extendedProperties?.private) {
    for (const [key, value] of Object.entries(extendedProperties.private)) {
      privateExtendedProperty.push(`${key}=${value}`);
    }
  }
  const sharedExtendedProperty = [] as `${string}=${string}`[];
  if (extendedProperties?.shared) {
    for (const [key, value] of Object.entries(extendedProperties.shared)) {
      sharedExtendedProperty.push(`${key}=${value}`);
    }
  }
  const events = Calendar.Events?.list?.(calendarId, {
    privateExtendedProperty,
    sharedExtendedProperty,
  });
  if (!events) return [];
  return events.items ?? [];
}
