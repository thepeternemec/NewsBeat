import { hhmm } from "./content";
import type { FeedItem } from "./story-feed";

export default function StoryRow({ item, label = "" }: { item: FeedItem; label?: string }) {
  return (
    <div className="story-item">
      <a className="mock-row" href={item.url} target="_blank" rel="noreferrer">
        <span className="k">{label}</span>
        <span className="v">{item.title}</span>
        <span className="s">
          <span className="s-pub">{item.source}</span>
          <time className="s-time" dateTime={item.published_at}>{hhmm(item.published_at)}</time>
        </span>
      </a>
      {item.reports.length > 1 && (
        <details className="story-sources">
          <summary>{item.reports.length} reports · {item.source_count} {item.source_count === 1 ? "publisher" : "publishers"} — view sources</summary>
          <ul>
            {item.reports.map(report => (
              <li key={report.id}>
                <a href={report.url} target="_blank" rel="noreferrer">{report.title}</a>
                <span>{report.source} · <time dateTime={report.published_at}>{report.published_at.slice(0, 10)} {hhmm(report.published_at)} UTC</time></span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
