import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";

// Pros: producers who made it on YouTube, and the plan you copied from one of them.
// Same endpoints the app uses (mobile/src/api/endpoints.ts).

export const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export const apiError = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  return fallback;
};

export const fetchPros = () => axios.get(`${API}/pros`).then((r) => r.data?.pros || []);
export const fetchPro = (id) => axios.get(`${API}/pros/${id}`).then((r) => r.data);
export const fetchStyleMatch = (id) => axios.get(`${API}/pros/${id}/analyze`).then((r) => r.data);
export const fetchStylePlan = () => axios.get(`${API}/pros/plan`).then((r) => r.data?.plan || null);
export const startStylePlan = (id, moves) => axios.post(`${API}/pros/${id}/plan`, { moves }).then((r) => r.data?.plan || null);
export const tickPlanStep = (stepId, done) => axios.patch(`${API}/pros/plan/steps/${stepId}`, { done }).then((r) => r.data?.plan || null);
export const endStylePlan = () => axios.delete(`${API}/pros/plan`);

/** Loads something once (and again on reload()); keeps the last good data while reloading. */
export function useLoad(load, deps = []) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const [run, setRun] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    load().then(
      (data) => alive && setState({ data, error: "", loading: false }),
      (error) => alive && setState((s) => ({ ...s, loading: false, error: apiError(error, "Could not load this.") })),
    );
    return () => {
      alive = false;
    };
    // `load` is a plain fetch function; reruns come from `deps` and reload()
  }, [run, ...deps]);
  const reload = useCallback(() => setRun((n) => n + 1), []);
  const setData = useCallback((data) => setState((s) => ({ ...s, data })), []);
  return { ...state, reload, setData };
}

/** Your active style plan, or null. */
export function useStylePlan() {
  const { data, setData, reload } = useLoad(fetchStylePlan);
  return { plan: data, setPlan: setData, reload };
}

/** Whether you can see Pro features: true while unknown, so the server decides. */
export function useProAccess() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    axios.get(`${API}/subscription/status`).then((r) => setStatus(r.data), () => setStatus(null));
  }, []);
  return { status, proAccess: !status || !!status.pro_access };
}

/** The plans open on the Dashboard; `reason` picks which plan it starts on. */
export const plansHref = (reason = "pro") => `/dashboard?plans=${reason}`;
