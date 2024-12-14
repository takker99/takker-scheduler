/** @jsxImportSource npm:preact@10 */
import { FunctionComponent, h } from "../deps/preact.tsx";

/** 読込中は押せなくなるボタン */
export const LoadButton: FunctionComponent<
  { loading: boolean; onClick?: h.JSX.MouseEventHandler<HTMLButtonElement> }
> = (
  { loading, onClick },
) => (loading
  ? (
    <div>
      <i className="fa fa-spinner" />
    </div>
  )
  : <button className="navi reload" onClick={onClick}>{"\ue06d"}</button>);
