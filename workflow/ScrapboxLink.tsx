/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */

import { FunctionComponent, h } from "../deps/preact.tsx";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
import { makeLink, Path } from "./path.ts";
declare const scrapbox: Scrapbox;

/** 内部projectではSPAを維持して遷移するリンク */
export const ScrapboxLink: FunctionComponent<Path> = (
  { children, project, title },
) => (
  <a
    href={makeLink({ project, title }).href}
    {...(project === scrapbox.Project.name
      ? ({})
      : ({ rel: "noopener noreferrer", target: "_blank" }))}
  >
    {children}
  </a>
);
