import { SyncInit, syncPages } from "../sync.ts";

/** 指定した日付ページに含まれる全てのタスクをcalendarに登録する
 *
 * @param init 登録先calendar IDを入れるobject
 */
export async function sync(project: string, title: string, init: SyncInit) {
  await syncPages(
    [{ project, title }],
    init,
  );
}
