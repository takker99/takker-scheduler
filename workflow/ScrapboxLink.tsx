/** @jsxImportSource npm:preact@10 */
import { FunctionComponent, h } from "../deps/preact.tsx";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
import { makeLink, Path } from "./path.ts";
declare const scrapbox: Scrapbox;

/** 内部projectではSPAを維持して遷移するリンク */
export const ScrapboxLink: FunctionComponent<
  & Path
  & Omit<
    h.JSX.HTMLAttributes<HTMLAnchorElement>,
    "rel" | "target" | "type" | "href"
  >
> = (
  { children, project, title, className, ...atributes },
) => (
  <a
    {...atributes}
    className={[className ?? "", "page-link"].join(" ")}
    type="link"
    href={makeLink({ project, title }).pathname}
    {...(project === scrapbox.Project.name
      ? ({ rel: "route" })
      : ({ rel: "noopener noreferrer", target: "_blank" }))}
  >
    {children}
  </a>
);
