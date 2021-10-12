import { exec, init } from "./fetch.js";
import { formatRFC3339 } from "../deps/date-fns.ts";
// CLIENT_ID,
// CLIENT_SECRET,

const clientId = CLIENT_ID;
const clientSecret = CLIENT_SECRET;
const scopes = ["https://www.googleapis.com/auth/calendar.events"];
init({ clientId, clientSecret, scopes });

export async function replaceEvents(calendarId, events, { project, title }) {
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

async function createEvent(calendarId, { summary, start, end, ...rest }) {
  const res = await exec(
    `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        start: { dateTime: formatRFC3339(start) },
        end: { dateTime: formatRFC3339(end) },
        ...rest,
      }),
    },
  );
  return await res.json();
}
async function updateEvent(
  calendarId,
  eventId,
  { summary, start, end, ...rest },
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
        start: { dateTime: formatRFC3339(start) },
        end: { dateTime: formatRFC3339(end) },
        ...rest,
      }),
    },
  );
  return await res.json();
}

async function deleteEvent(calendarId, eventId) {
  await exec(
    `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${
      encodeURIComponent(eventId)
    }`,
    {
      method: "DELETE",
    },
  );
}

async function searchEvents(calendarId, extendedProperties) {
  const params = new URLSearchParams();
  Object.keys(extendedProperties.private).forEach((key) =>
    params.append(
      "privateExtendedProperty",
      `${key}=${extendedProperties.private[key]}`,
    )
  );

  const res = await exec(
    `/calendar/v3/calendars/${
      encodeURIComponent(calendarId)
    }/events?${params.toString()}`,
  );
  return (await res.json()).items;
}

async function getEvents(calendarId, start, end) {
  const params = new URLSearchParams();
  params.append("timeMax", formatRFC3339(end));
  params.append("timeMin", formatRFC3339(start));

  const res = await exec(
    `/calendar/v3/calendars/${
      encodeURIComponent(calendarId)
    }/events?${params.toString()}`,
  );
  return (await res.json()).items;
}
