/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */

import { FunctionComponent, h } from "../deps/preact.tsx";

/** 読み込み状況を表示する部品 */
export const ProgressBar: FunctionComponent<{ loading: boolean }> = (
  { loading },
) => (loading
  ? (
    <div className="progress">
      <i className="fa fa-spinner" />
      <span>{"loading tasks..."}</span>
    </div>
  )
  : <div className="progress" />);
