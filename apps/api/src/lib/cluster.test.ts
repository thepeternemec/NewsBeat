import { NewsStorySchema } from "@newsbeat/contracts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { clusterStories, sameStory, storyView, tokens, type Clusterable } from "./cluster.js";
let seq = 0;
const a = (title: string, source = "Reuters", published_at = "2026-10-20T10:00:00.000Z", id = String(++seq)): Clusterable => ({
  id, title, source, published_at, url: `https://example.com/report/${id}`,
});

test("the Apple syndication seen in production groups across publishers", () => {
  const reports = [a("Prediction: Apple’s Stock Is Due for a Reality Check on Nov. 2", "The Motley Fool"),
    a("Prediction: Apple's Stock Is Due for a Reality Check on Nov. 2", "AOL.com")];
  const groups = clusterStories(reports);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.source_count, 2);
  assert.deepEqual(groups[0]!.articles, reports, "keep every original link and publication time");
});

test("reordered wording and simple verb inflections group", () => {
  assert(sameStory(a("Apple invests $100 million in Pennsylvania titanium factory"),
    a("Pennsylvania titanium factory gets $100 million Apple investment")));
});

test("the same ruling with apostrophe variations groups", () => {
  const groups = clusterStories([
    a("Judge won't block Trump administration from giving SpaceX acres of wildlife refuge in launch site deal", "AP"),
    a("Judge wont block Trump administration from giving SpaceX acres of wildlife refuge in launch site deal", "The Hill"),
  ]);
  assert.equal(groups.length, 1);
});

test("contradictory outcomes, figures and speculation remain separate", () => {
  const pairs = [
    ["SpaceX Starship orbital launch succeeds", "SpaceX Starship orbital launch aborted"],
    ["Apple revenue rises 12% in third quarter", "Apple revenue falls 12% in third quarter"],
    ["Apple quarterly revenue change is +10%", "Apple quarterly revenue change is -10%"],
    ["Apple revenue reaches $1 billion in third quarter", "Apple revenue reaches $1 million in third quarter"],
    ["Apple quarterly revenue reaches 10 billion", "Apple quarterly revenue reaches 10%"],
    ["Apple revenue rises 12% in third quarter", "Apple revenue rises 21% in third quarter"],
    ["Apple revenue rises $1.8 billion in third quarter", "Apple revenue rises $18 billion in third quarter"],
    ["Apple profit rises 12% in third quarter", "Apple revenue rises 12% in third quarter"],
    ["Judge will block Apple app store payment rule changes", "Judge will not block Apple app store payment rule changes"],
    ["Apple reportedly acquires startup to expand artificial intelligence team", "Apple acquires startup to expand artificial intelligence team"],
    ["Apple launches new iPhone stores in China", "Apple launches new iPhone stores in India"],
  ];
  for (const [x,y] of pairs) assert.equal(clusterStories([a(x!),a(y!)]).length, 2, `${x} / ${y}`);
});

test("recurring headlines outside 24 hours stay separate, as do invalid dates", () => {
  const title = "Apple shares rise following analyst upgrade";
  assert.equal(clusterStories([a(title), a(title, "AOL", "2026-10-22T10:00:00.000Z")]).length, 2);
  assert.equal(sameStory(a(title), a(title,"AOL","bad-date")), false);
});

test("short generic company headlines do not absorb unrelated coverage", () => {
  assert.equal(sameStory(a("Apple news today"), a("Apple news today as suppliers announce earnings")), false);
});

test("a group cannot grow by a chain of partially matching reports", () => {
  const title = "Apple announces factory expansion in Pennsylvania for titanium smartphone components";
  const reports = [a(title,"A","2026-10-20T00:00:00.000Z"),
    a(title,"B","2026-10-20T20:00:00.000Z"), a(title,"C","2026-10-21T16:00:00.000Z")];
  const groups = clusterStories(reports);
  assert.equal(groups.length,2);
  assert.equal(groups.flatMap(g=>g.articles).length,3);
});

test("lead and grouping are deterministic for reverse input and numeric IDs", () => {
  const x=a("Apple invests $100 million in Pennsylvania titanium factory","Reuters",undefined,"9984466");
  const y=a(x.title,"AOL",undefined,"39276235");
  assert.deepEqual(clusterStories([y,x]),clusterStories([x,y]));
  assert.equal(clusterStories([y,x])[0]!.articles[0]!.id,"9984466");
});

test("latest coverage sorts first, not the most publishers", () => {
  const older = "Apple invests $100 million in Pennsylvania titanium factory";
  const latest = "Apple announces quarterly earnings release date";
  const groups = clusterStories([a(older,"Reuters"),a(older,"AOL"),a(latest,"Apple","2026-10-20T12:00:00.000Z")]);
  assert.equal(groups[0]!.lead,latest);
});

test("publisher count ignores casing; no reports disappear or inputs mutate", () => {
  const reports=[a("Apple announces quarterly earnings release date","Reuters"),a("Apple announces quarterly earnings release date"," reuters ")];
  const before=structuredClone(reports);
  const groups=clusterStories(reports);
  assert.equal(groups[0]!.source_count,1);
  assert.equal(groups[0]!.articles.length,2);
  assert.deepEqual(reports,before);
  assert.deepEqual(clusterStories([]),[]);
  assert(tokens("Apple profits rise $1.8 billion").has("1.8"));
});

test("public grouped response preserves every report and parses the shared contract", () => {
  const reports = [a("Apple announces quarterly earnings release date","Reuters"), a("Apple announces quarterly earnings release date","AOL")]
    .map(report => ({...report, first_indexed_at: "2026-10-20T10:15:00.000Z"}));
  const views = clusterStories(reports).map(storyView);
  assert.equal(views.length,1);
  const view = NewsStorySchema.parse(views[0]);
  assert.equal(view.articles,2);
  assert.deepEqual(view.reports,reports);
  assert.deepEqual(view.lead_article,reports[0]);
});
