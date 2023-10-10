import { addMinutes, isValid } from "../deps/date-fns.ts";
import { Result, isNumber } from "../deps/scrapbox-std.ts";
import { format, fromDate, LocalDateTime, toDate } from "../howm/localDate.ts";
import {
    Task,

} from "../howm/parse.ts";
import {
    Event,
} from "../event/parse.ts";
import { Status, toStatus } from "../howm/status.ts";

/** 繰り返しを表す */
export interface Recurrence {
    /** task name */
    name: string;

    /** 開始年 */
    year: number | "*";

    /** 開始月 */
    month: number | "*";

    /** 開始日 */
    date: RegDate

    hours: number;

    minutes: number;

    /** 所要時間 */
    duration: number;

    status?: Status;

    /** 解析前の文字列 */
    raw: string;
}

export type RegDate = number | "*" | "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export interface LackDateError {
    name: "LackDateError";
    message: string;
}

/** Eventを解析する
 *
 * @param text Eventの文字列
 * @return 解析結果。Eventでなければ`undefined`を返す
 */
export const parse = (
    text: string,
):
    Recurrence | undefined => {
    const matched = text.match(
        /([\+\-!~]?)@(\d{4}|\*)-(\d{2}|\*)-(\d{2}|\*|Sun|Mon|Tue|Wed|Thu|Fri|Sat)T(\d{2}):(\d{2})D(\d+)/i
    );
    // eventでないとき
    if (!matched) return;

    const [
        matchedText,
        statusStr,
        syear,
        smonth,
        sdate,
        shours,
        sminutes,
        durationStr,
    ] = matched;

    /** task name */
    const name = `${text.slice(0, matched.index).trim()}${text.slice((matched.index ?? 0) + matchedText.length).trim()
        }`;
    const status = toStatus(statusStr);
    const year = checkRegNumber(syear);
    const month = checkRegNumber(smonth)
    const date = checkRegDate(sdate)
    const hours = parseInt(shours);
    const minutes = parseInt(sminutes)

    const recurrence: Recurrence = { name, year, month, date, hours, minutes, duration: parseInt(durationStr), raw: text };
    if (status) recurrence.status = status



    return recurrence
};

/** 指定日に繰り返す繰り返しタスクか調べる。
 *
 * 繰り返す場合はそのタスクを指定日の日付で生成する。
 * 繰り返さない場合は`undefined`を返す
 */
export const makeRepeat = (recurrence: Recurrence, date: Date): Task | Event | undefined => {
    const localDate = fromDate(date);
    if (isNumber(recurrence.year) && recurrence.year !== date.getFullYear()) return;
    if (isNumber(recurrence.month) && recurrence.month !== date.getMonth() + 1) return;
    if (isNumber(recurrence.date) && recurrence.date !== date.getDate()) return;
    if (!isNumber(recurrence.date) && recurrence.date !== "*" && toDayNumber(recurrence.date) !== date.getDay()) return;

    return recurrence.status ? {
        name: recurrence.name,
        status: recurrence.status,
        start: localDate,
        duration: recurrence.duration,
        raw: recurrence.raw,
    } : {
        name: recurrence.name,
        start: localDate,
        end: fromDate(addMinutes(date, recurrence.duration)),
        raw: recurrence.raw,
    }
}

/** 数字か`*`のときのみ使える */
const checkRegNumber = (text: string): number | "*" => {
    if (text === "*") return text;
    return parseInt(text);
}

/** エラー処理なし */
const checkRegDate = (text: string): RegDate => {
    switch (text.toLowerCase()) {
        case "*": return "*";
        case "sun": return "Sun"
        case "mon": return "Mon"
        case "tue": return "Tue"
        case "wed": return "Wed"
        case "thu": return "Thu"
        case "fri": return "Fri"
        case "sat": return "Sat"
        default: return parseInt(text)
    }
}

const toDayNumber = (day:
    "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat"

): 0 | 1 | 2 | 3 | 4 | 5 | 6 => {

    switch (day) {
        case "Sun": return 0
        case "Mon": return 1
        case "Tue": return 2
        case "Wed": return 3
        case "Thu": return 4
        case "Fri": return 5
        case "Sat": return 6
    }
}