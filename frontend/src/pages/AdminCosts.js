import React, { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, DollarSign, Server, Cpu, Activity, AlertTriangle, Gauge } from "lucide-react";

export default function AdminCosts() {
  const [costs, setCosts] = useState(null);
  const [ops, setOps] = useState(null);
  const [controls, setControls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingControls, setSavingControls] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const extractErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail?.message) return detail.message;
    return fallback;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [costsResponse, opsResponse] = await Promise.all([
        axios.get(`${API}/admin/costs`),
        axios.get(`${API}/admin/ops`),
      ]);
      setCosts(costsResponse.data);
      setOps(opsResponse.data);
      setControls(opsResponse?.data?.health?.controls || null);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch costs:", err);
      if (err?.response?.status === 403) {
        setError("Unauthorized. This page is only available to admin accounts.");
      } else {
        setError("Failed to load cost data. Ensure you are logged in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (featureKey, nextValue) => {
    if (!controls) return;
    setSavingControls(true);
    try {
      const response = await axios.put(`${API}/admin/ops/controls`, {
        disabled_features: {
          [featureKey]: nextValue,
        },
      });
      setControls(response?.data?.controls || controls);
      await fetchData();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to update feature controls."));
    } finally {
      setSavingControls(false);
    }
  };

  const handleSetOverloadMode = async (enabled) => {
    setSavingControls(true);
    try {
      const response = await axios.put(`${API}/admin/ops/controls`, {
        overload_mode_enabled: enabled,
      });
      setControls(response?.data?.controls || controls);
      await fetchData();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to update overload mode."));
    } finally {
      setSavingControls(false);
    }
  };

  const handleGlobalHeavyJobs = async (enabled) => {
    setSavingControls(true);
    try {
      const response = await axios.put(`${API}/admin/ops/controls`, {
        global_disable_new_heavy_jobs: enabled,
      });
      setControls(response?.data?.controls || controls);
      await fetchData();
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to update heavy-job controls."));
    } finally {
      setSavingControls(false);
    }
  };

  if (loading && !costs) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full border-l-4 border-red-500">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Costs</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
              Back to Dashboard
            </Button>
            <Button onClick={fetchData}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const health = ops?.health || {};
  const healthControls = controls || health?.controls || {};
  const disabledFeatures = healthControls?.disabled_features || {};

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Backend Ops + Cost Tracker</h1>
            <p className="text-slate-500 mt-1">Launch hardening controls, queue visibility, and monthly cost estimates.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={fetchData} className="gap-2" disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-emerald-500 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Activity className="h-8 w-8 text-emerald-500" />
                <span className="text-2xl font-bold text-slate-900">{health?.status || "unknown"}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Ready: {health?.ready ? "yes" : "no"}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-amber-500 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Queued Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Gauge className="h-8 w-8 text-amber-500" />
                <span className="text-4xl font-bold text-slate-900">{health?.jobs?.queued ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-blue-600 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Processing Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Server className="h-8 w-8 text-blue-600" />
                <span className="text-4xl font-bold text-slate-900">{health?.jobs?.processing ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-red-500 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">Failed Last Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <span className="text-4xl font-bold text-slate-900">{health?.jobs?.failed_last_hour ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md">
          <CardHeader className="bg-white border-b border-slate-100">
            <CardTitle>Launch Controls</CardTitle>
            <CardDescription>Use these when promo traffic starts stressing the worker queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => handleSetOverloadMode(!healthControls?.overload_mode_enabled)} disabled={savingControls} variant={healthControls?.overload_mode_enabled ? "destructive" : "default"}>
                {healthControls?.overload_mode_enabled ? "Disable Overload Mode" : "Enable Overload Mode"}
              </Button>
              <Button onClick={() => handleGlobalHeavyJobs(!healthControls?.global_disable_new_heavy_jobs)} disabled={savingControls} variant="outline">
                {healthControls?.global_disable_new_heavy_jobs ? "Allow New Heavy Jobs" : "Pause New Heavy Jobs"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(disabledFeatures).map(([featureKey, disabled]) => (
                <div key={featureKey} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{featureKey.replace(/_/g, " ")}</p>
                    <p className="text-xs text-slate-500">{disabled ? "Temporarily disabled" : "Available"}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={disabled ? "destructive" : "outline"}
                    disabled={savingControls}
                    onClick={() => handleToggleFeature(featureKey, !disabled)}
                  >
                    {disabled ? "Enable" : "Disable"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100">
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Most recent background job activity.</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {(ops?.recent_jobs || []).map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-3 text-sm text-slate-900">{job.type}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{job.status}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">{job.progress}%</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{job.updated_at || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Existing cost UI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-blue-600 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Total Estimated Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <span className="text-4xl font-bold text-slate-900">${costs?.total_estimated_cost.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Hosting + AI Usage</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-emerald-500 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Hosting (Fixed)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Server className="h-8 w-8 text-emerald-500" />
                <span className="text-4xl font-bold text-slate-900">${costs?.hosting_cost.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Amazon Lightsail Instance</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-purple-500 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                AI Usage (Variable)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Cpu className="h-8 w-8 text-purple-500" />
                <span className="text-4xl font-bold text-slate-900">${costs?.llm_cost.toFixed(4)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Grok / LLM Token Usage</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100">
            <CardTitle>Usage Breakdown</CardTitle>
            <CardDescription>Detailed token usage by operation type</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Operation Type</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Requests</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Tokens In</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Tokens Out</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {costs?.details.length > 0 ? (
                  costs.details.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 capitalize">
                        {item._id.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right font-mono">
                        {item.count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right font-mono">
                        {item.total_tokens_in.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right font-mono">
                        {item.total_tokens_out.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 text-right font-mono">
                        ${item.total_cost.toFixed(5)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                      <p className="text-lg font-medium">No usage recorded yet this month.</p>
                      <p className="text-sm mt-1">Start using AI features to see data here.</p>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <td className="px-6 py-3">Total</td>
                  <td className="px-6 py-3 text-right font-mono">
                    {costs?.details.reduce((acc, item) => acc + item.count, 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    {costs?.details.reduce((acc, item) => acc + item.total_tokens_in, 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    {costs?.details.reduce((acc, item) => acc + item.total_tokens_out, 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right font-mono">
                    ${costs?.llm_cost.toFixed(4)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold">About Cost Tracking</p>
            <p className="mt-1">
              Hosting costs are fixed based on your Amazon Lightsail plan (default $12.00).
              AI costs are estimated based on token usage with Grok-2 pricing ($2/M input, $10/M output).
              Actual billing from xAI and AWS may vary slightly due to taxes and exchange rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
