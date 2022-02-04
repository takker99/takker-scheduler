/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference types="https://raw.githubusercontent.com/takker99/deno-gas-types/main/mod.d.ts" />

import { formatRFC3339 } from "../deps/date-fns.ts";
import {
  createEvent,
  deleteEvent,
  Event,
  search,
  updateEvent,
} from "./events.ts";

/** 置換するcalendar eventsの範囲を決めるためのparameters */
export interface ReplaceInit {
  /** eventの取得先project */ project: string;
  /** eventの取得先ページタイトル */ title: string;
}
/** 特定の条件に一致したcalendar eventsを置換する
 *
 * @param calendarId - calendar eventsの登録先calendarのID
 * @param events - 置換したいcalendar events
 */
export function replace(
  calendarId: string,
  events: Event[],
  { project, title }: ReplaceInit,
) {
  // projectとtitleが一致する予定を検索する
  const existEvents = search(calendarId, {
    private: { project, title },
  });

  // 既存のeventも新規作成するeventもなければ何もしない
  if (events.length === 0 && existEvents.length === 0) return;

  // 以前登録したeventsを更新する
  const newEvents = [] as Event[];

  for (const event of events) {
    const index = existEvents.findIndex(({ extendedProperties }) =>
      event.id === extendedProperties?.private?.id
    );
    if (index < 0) {
      // 新規作成するevent
      newEvents.push(event);
      continue;
    }

    const oldEvent = existEvents[index];
    // 紐付けられているとわかったeventはどんどん削っていく
    existEvents.splice(index, 1);

    const start = formatRFC3339(event.start);
    const end = formatRFC3339(event.end);
    // 変更がなければ何もしない
    if (
      oldEvent.summary === event.summary &&
      oldEvent.start?.dateTime === start &&
      oldEvent.end?.dateTime === end
    ) {
      continue;
    }

    updateEvent(event, {
      calendarId,
      project,
      title,
      eventId: oldEvent.id ?? "",
    });
  }

  // 紐付けられていないeventは、新しいeventと紐付ける
  for (let i = 0; i < Math.min(existEvents.length, newEvents.length); i++) {
    const event = newEvents[i];
    updateEvent(event, {
      calendarId,
      project,
      title,
      eventId: existEvents[i].id ?? "",
    });
  }
  if (existEvents.length >= newEvents.length) {
    // 不要なeventを削除する
    for (let i = newEvents.length; i < existEvents.length; i++) {
      deleteEvent(calendarId, existEvents[i].id ?? "");
    }
  } else {
    for (let i = existEvents.length; i < newEvents.length; i++) {
      // 足りない分は新規作成する
      createEvent(newEvents[i], { calendarId, project, title });
    }
  }
}
