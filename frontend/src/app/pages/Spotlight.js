import { useEffect } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";

import * as api from "@/app/api";
import { Avatar, LikeButton, TopBeat, VerifiedBadge, isVerified, rememberProducers, topBeatOf } from "@/app/producer";
import { PlanCard, ProsGallery, usePlan } from "@/app/pros";
import { loadSocial, useRequest, useSocial } from "@/app/store";
import { Button, Card, Screen, Segmented, Spinner, cx } from "@/app/ui";

// Spotlight: the community's producers, and the Pros who made it on YouTube (the app's second tab).

const points = (p) => p.spotlight_score ?? p.likes ?? 0;

const loadSpotlight = async () => {
  const res = await api.spotlight();
  rememberProducers([...res.featured_producers, ...res.trending_producers, ...res.new_producers, ...(res.all_producers ?? [])]);
  return res;
};

export default function Spotlight({ signedIn }) {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "pros" ? "pros" : "community";
  const list = useRequest(loadSpotlight);
  const { me } = useOutletContext();

  useEffect(() => {
    if (signedIn) void loadSocial();
  }, [signedIn]);

  return (
    <Screen title="Spotlight" wide>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <Segmented
          value={tab}
          onChange={(v) => setParams(v === "pros" ? { tab: "pros" } : {}, { replace: true })}
          label="Spotlight section"
          options={[
            { value: "community", label: "Community" },
            { value: "pros", label: "Pros" },
          ]}
        />
      </div>
      {tab === "community" ? <Community list={list} me={me?.data} /> : signedIn ? <Pros /> : <SignInCard />}
    </Screen>
  );
}

function SignInCard() {
  return (
    <Card style={{ maxWidth: 520 }}>
      <span className="s-card-title">Sign in to see the Pros</span>
      <span className="s-body">See why the biggest type-beat producers blew up, read their numbers and copy their moves.</span>
      <Button title="Sign in" href="/" />
    </Card>
  );
}

function Community({ list, me }) {
  const { data, error, loading, reload } = list;
  const social = useSocial();

  if (loading) return <Spinner />;
  if (error || !data) {
    return (
      <Card style={{ maxWidth: 520 }}>
        <span className="s-error">{error ?? "Could not load Spotlight."}</span>
        <Button title="Try again" variant="secondary" size="md" onClick={reload} />
      </Card>
    );
  }

  // The server ranks all_producers by its trending score, so position = rank.
  const ranked = data.all_producers?.length ? data.all_producers : data.trending_producers;
  const star = data.featured_producers[0] ?? ranked[0];
  const trending = data.trending_producers.filter((p) => p.user_id !== star?.user_id).slice(0, 10);
  const top = ranked.slice(0, 10);
  const myRank = me ? ranked.findIndex((p) => p.user_id === me.user_id) : -1;

  if (!star) return <span className="s-muted">No producers in Spotlight yet.</span>;

  return (
    <div className="s-cols">
      <div className="s-col">
        {social.error ? <span className="s-error">{social.error}</span> : null}
        <Featured producer={star} label={data.featured_producers[0] ? "Producer of the week" : "Top producer"} />

        {trending.length > 0 ? (
          <div className="s-stack" style={{ gap: 10 }}>
            <span className="s-label">Trending</span>
            <div className="s-scroll-x">
              {trending.map((p, i) => (
                <Link key={p.user_id} to={`/producer/${p.user_id}`} className="s-trend" aria-label={`${p.username}, trending number ${i + 1}`}>
                  <Avatar producer={p} size={40} />
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="s-truncate" style={{ fontSize: 14, fontWeight: 700 }}>
                      {p.username}
                    </span>
                    {isVerified(p) ? <VerifiedBadge size={12} /> : null}
                  </span>
                  <span className="s-mono" style={{ fontSize: 12 }}>
                    #{i + 1} · {points(p)} pts
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="s-col">
        <div>
          <div className="s-row-between" style={{ paddingBottom: 8 }}>
            <span className="s-label">Leaderboard</span>
            <span className="s-muted" style={{ fontSize: 13 }}>
              {ranked.length} producers
            </span>
          </div>
          {top.map((p, i) => (
            <LeaderRow key={p.user_id} producer={p} rank={i + 1} you={p.user_id === me?.user_id} />
          ))}
          {me && myRank >= 10 ? <LeaderRow producer={ranked[myRank]} rank={myRank + 1} you /> : null}
          {me && myRank < 0 ? (
            <div className="s-hair s-you">
              <span className="s-mono" style={{ width: 22, fontSize: 13, color: "var(--text)" }}>
                –
              </span>
              <span style={{ fontWeight: 700 }}>You</span>
              <span className="s-muted" style={{ fontSize: 13 }}>
                Not ranked yet. Keep your streak going.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Featured({ producer: p, label }) {
  const beat = topBeatOf(p);
  return (
    <div className="s-featured">
      <Link to={`/producer/${p.user_id}`} style={{ color: "inherit", textDecoration: "none", display: "block" }} aria-label={`Open ${p.username}`}>
        {p.banner_url ? <img className="s-banner" src={p.banner_url} alt="" style={{ height: 120 }} /> : <span className="s-banner" style={{ height: 120 }} />}
        <span style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "0 14px 12px" }}>
          <span style={{ marginTop: -30, borderRadius: "50%", border: "3px solid var(--card)", display: "flex" }}>
            <Avatar producer={p} size={56} />
          </span>
          <span className="s-row-main" style={{ paddingTop: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="s-display s-truncate" style={{ fontSize: 18 }}>
                {p.username}
              </span>
              {isVerified(p) ? <VerifiedBadge /> : null}
            </span>
            <span className="s-sub">
              {label}
              {p.spotlight_tier ? ` · ${p.spotlight_tier}` : ""}
            </span>
          </span>
          <span style={{ paddingTop: 10 }}>
            <LikeButton producer={p} />
          </span>
        </span>
      </Link>
      <div className="s-stack" style={{ gap: 10, padding: "0 14px 14px" }}>
        {p.bio ? <p className="s-sub s-clamp2">{p.bio}</p> : null}
        {beat ? <TopBeat beat={beat} /> : null}
        <div className="s-chips">
          {(p.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="s-tag">
              {t}
            </span>
          ))}
          {p.current_streak ? <span className="s-tag">{p.current_streak}d streak</span> : null}
        </div>
      </div>
    </div>
  );
}

function LeaderRow({ producer: p, rank, you }) {
  return (
    <Link to={`/producer/${p.user_id}`} className={cx("s-hair", you && "s-you")}>
      <span className="s-mono" style={{ width: 22, fontSize: 13, fontWeight: 500, color: rank <= 3 || you ? "var(--text)" : undefined }}>
        {rank}
      </span>
      <Avatar producer={p} size={28} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
        <span className="s-truncate" style={{ fontWeight: you ? 700 : 400 }}>
          {you ? "You" : p.username}
        </span>
        {isVerified(p) ? <VerifiedBadge size={12} /> : null}
      </span>
      <span className="s-mono" style={{ fontSize: 12, color: you ? "var(--text)" : undefined }}>
        {points(p)}
      </span>
    </Link>
  );
}

// Pros: your plan (if you have one) above the gallery of producers.
function Pros() {
  const { plan, setPlan } = usePlan();
  return (
    <>
      {plan ? (
        <div style={{ maxWidth: 520, width: "100%" }}>
          <PlanCard plan={plan} onChange={setPlan} />
        </div>
      ) : null}
      <ProsGallery />
    </>
  );
}
