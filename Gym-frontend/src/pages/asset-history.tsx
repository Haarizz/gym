import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { statusColors, categoryIcons } from "./manage-assets";
import { assetsService, Asset, AssetEvent } from "../utils/supabase/assets-service";
import { CurrencyValue } from "../utils/currency";
import {
  History,
  CalendarDays,
  Calendar,
  FileBarChart,
  Printer,
  MapPin as MapPinIcon,
  ExternalLink,
  FileText,
  ShoppingCart,
  Move,
  Wrench,
  TrendingDown,
  Trash2,
  Eye,
  AlertCircle,
  Activity,
  CheckCircle2,
  Timer,
  PlayCircle,
  XOctagon,
  Info,
} from "lucide-react";

const getCategoryIcon = (category: string) => {
  const Icon = categoryIcons[category as keyof typeof categoryIcons] || FileText;
  return <Icon className="h-4 w-4" />;
};

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "purchase":
      return <ShoppingCart className="h-5 w-5 text-green-600" />;
    case "transfer":
      return <Move className="h-5 w-5 text-blue-600" />;
    case "maintenance":
      return <Wrench className="h-5 w-5 text-orange-600" />;
    case "depreciation":
      return <TrendingDown className="h-5 w-5 text-red-600" />;
    case "disposal":
      return <Trash2 className="h-5 w-5 text-gray-600" />;
    case "inspection":
      return <Eye className="h-5 w-5 text-purple-600" />;
    case "alert":
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    default:
      return <Activity className="h-5 w-5 text-gray-600" />;
  }
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case "purchase":
      return "bg-green-50";
    case "transfer":
      return "bg-blue-50";
    case "maintenance":
      return "bg-orange-50";
    case "depreciation":
      return "bg-red-50";
    case "disposal":
      return "bg-gray-50";
    case "inspection":
      return "bg-purple-50";
    case "alert":
      return "bg-yellow-50";
    default:
      return "bg-gray-50";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "pending":
      return <Timer className="h-4 w-4 text-yellow-600" />;
    case "in-progress":
      return <PlayCircle className="h-4 w-4 text-blue-600" />;
    case "cancelled":
      return <XOctagon className="h-4 w-4 text-red-600" />;
    default:
      return <Info className="h-4 w-4 text-gray-600" />;
  }
};

const exportAssetHistory = (asset: any, events: AssetEvent[], format: "pdf" | "excel") => {
  console.log(`Exporting ${asset.name} history as ${format.toUpperCase()}`, events);
  if (format === "pdf") {
    alert(`PDF report for ${asset.name} will be downloaded shortly.`);
  } else {
    alert(`Excel report for ${asset.name} will be downloaded shortly.`);
  }
};

export function AssetHistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedHistoryAsset, setSelectedHistoryAsset] = useState<any>(null);
  const [historyViewMode, setHistoryViewMode] = useState<"timeline" | "table">("timeline");
  const [selectedHistoryEvent, setSelectedHistoryEvent] = useState<any>(null);
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        const assetsRes = await assetsService.getAssets({ page: 1, size: 500 });
        if (!isMounted) return;
        setAssets(assetsRes.assets);

        const assetId = searchParams.get("assetId");
        const nextAsset = assetId
          ? assetsRes.assets.find((asset) => String(asset.id) === assetId) || assetsRes.assets[0]
          : assetsRes.assets[0];
        setSelectedHistoryAsset(nextAsset || null);
      } catch (err) {
        console.error("Failed to load assets:", err);
        if (!isMounted) return;
        setError("Failed to load assets. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadAssets();
    return () => { isMounted = false; };
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    const loadEvents = async () => {
      if (!selectedHistoryAsset?.id) {
        setEvents([]);
        return;
      }
      try {
        const data = await assetsService.getAssetEvents(selectedHistoryAsset.id);
        if (!isMounted) return;
        setEvents(data);
      } catch (err) {
        console.error("Failed to load asset events:", err);
      }
    };
    loadEvents();
    return () => { isMounted = false; };
  }, [selectedHistoryAsset]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-sm text-muted-foreground">Loading asset history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-red-600">{error}</div>
        <Button variant="outline" onClick={() => navigate("/manage-assets")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Asset History & Lifecycle</h1>
            <p className="text-sm text-gray-600">
              {selectedHistoryAsset
                ? `Viewing: ${selectedHistoryAsset.name}`
                : "Complete asset lifecycle tracking"}
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track complete asset lifecycle from purchase to disposal with detailed timeline and analytics.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/manage-assets")}>
          Back
        </Button>
      </div>

      <div className="space-y-6">
        {/* Asset Selector and Controls */}
        <div className="grid gap-4 p-4 bg-gray-50 rounded-lg md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Select Asset</Label>
              <Select
                value={selectedHistoryAsset?.id ? String(selectedHistoryAsset.id) : ""}
                onValueChange={(value) => {
                  const asset = assets.find((a) => String(a.id) === value);
                  setSelectedHistoryAsset(asset || null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an asset to view history" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={String(asset.id)}>
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(asset.category)}
                        <span>
                          {asset.name} ({asset.code})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">View Mode</Label>
              <Select
                value={historyViewMode}
                onValueChange={(value: "timeline" | "table") => setHistoryViewMode(value)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timeline">Timeline</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedHistoryAsset && (
            <div className="flex items-center gap-2 md:justify-end">
              <Button variant="outline" size="sm" onClick={() => exportAssetHistory(selectedHistoryAsset, events, "pdf")}>
                <Printer className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportAssetHistory(selectedHistoryAsset, events, "excel")}>
                <FileBarChart className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          )}
        </div>

        {selectedHistoryAsset && (
          <>
            {/* Asset Overview Card */}
            <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 items-center">
                  <div className="flex items-center gap-4 lg:col-span-2">
                    <div className="bg-teal-100 p-3 rounded-lg">
                      {getCategoryIcon(selectedHistoryAsset.category)}
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-lg leading-tight">{selectedHistoryAsset.name}</div>
                      <div className="text-sm text-teal-700">{selectedHistoryAsset.code}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center text-center gap-2 lg:col-span-1">
                    <div className="text-2xl font-bold text-teal-800">
                      <CurrencyValue amount={selectedHistoryAsset.purchasePrice} />
                    </div>
                    <div className="text-xs text-teal-600">Purchase Price</div>
                  </div>

                  <div className="flex flex-col items-center text-center gap-2 lg:col-span-1">
                    <div className="text-2xl font-bold text-blue-800">
                      <CurrencyValue amount={selectedHistoryAsset.currentValue} />
                    </div>
                    <div className="text-xs text-blue-600">Current Value</div>
                  </div>

                  <div className="flex flex-col items-center text-center gap-2 lg:col-span-1">
                    <div className="text-2xl font-bold text-gray-800">
                      {Math.floor(
                        (Date.now() - new Date(selectedHistoryAsset.purchaseDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}
                      d
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Age (Days)
                    </div>
                  </div>

                  <div className="flex flex-col items-center text-center gap-2 lg:col-span-1">
                    <Badge className={statusColors[selectedHistoryAsset.status as keyof typeof statusColors]}>
                      {selectedHistoryAsset.status}
                    </Badge>
                    <div className="text-xs text-gray-600">Current Status</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lifecycle Timeline or Table */}
            {historyViewMode === "timeline" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarDays className="h-5 w-5" />
                    <span>Asset Lifecycle Timeline</span>
                  </CardTitle>
                  <CardDescription>
                    Complete chronological history from purchase to current status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-6">
                      {events.map(
                        (event, index) => (
                          <div key={event.id} className="relative">
                            {index < events.length - 1 && null}

                            <div
                              className={`flex items-start space-x-4 p-4 rounded-lg cursor-pointer border-0 shadow-md hover:shadow-lg transition-shadow ${getEventColor(
                                event.type
                              )}`}
                              onClick={() => setSelectedHistoryEvent(event)}
                            >
                              <div className="flex-shrink-0 bg-white p-2 rounded-full border-2 border-gray-300">
                                {getEventIcon(event.type)}
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-semibold text-lg">{event.title}</div>
                                  <div className="flex items-center space-x-3">
                                    {event.amount != null && event.amount !== 0 && (
                                      <div
                                        className={`font-bold ${
                                          event.amount > 0 ? "text-green-600" : "text-red-600"
                                        }`}
                                      >
                                        {event.amount > 0 ? "+" : ""}
                                        <CurrencyValue amount={Math.abs(event.amount)} />
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-1">
                                      {getStatusIcon(event.status)}
                                      <span className="text-sm text-gray-600 capitalize">{event.status}</span>
                                    </div>
                                  </div>
                                </div>

                                <p className="text-gray-700 mb-2">{event.description}</p>

                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center space-x-4 text-gray-600">
                                    <span className="flex items-center space-x-1">
                                      <Calendar className="h-4 w-4" />
                                      <span>{new Date(event.date).toLocaleDateString()}</span>
                                    </span>
                                    <span className="flex items-center space-x-1">
                                      <MapPinIcon className="h-4 w-4" />
                                      <span>{event.location}</span>
                                    </span>
                                  </div>
                                  <Button variant="ghost" size="sm">
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Asset History Table</span>
                  </CardTitle>
                  <CardDescription>Detailed tabular view of all asset lifecycle events</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map(
                        (event) => (
                          <TableRow key={event.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">
                              {new Date(event.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getEventIcon(event.type)}
                                <span className="capitalize">{event.type.replace("-", " ")}</span>
                              </div>
                            </TableCell>
                            <TableCell>{event.title}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <MapPinIcon className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">{event.location}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {event.amount != null && event.amount !== 0 && (
                                <span
                                  className={`font-medium ${
                                    event.amount > 0 ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {event.amount > 0 ? "+" : ""}
                                  <CurrencyValue amount={Math.abs(event.amount)} />
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(event.status)}
                                <span className="capitalize">{event.status}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedHistoryEvent(event)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Analytics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-800">
                    {events.filter(
                      (e) => e.type === "maintenance"
                    ).length}
                  </div>
                  <div className="text-sm text-green-600">Total Maintenance</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-800">
                    {events.filter(
                      (e) => e.type === "transfer"
                    ).length}
                  </div>
                  <div className="text-sm text-blue-600">Total Transfers</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-800">
                    <CurrencyValue amount={
                      events
                        .filter((e) => e.type === "maintenance")
                        .reduce((sum, e) => sum + (e.amount || 0), 0)
                    } />
                  </div>
                  <div className="text-sm text-orange-600">Maintenance Costs</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-800">
                    {selectedHistoryAsset.utilizationRate}%
                  </div>
                  <div className="text-sm text-purple-600">Utilization Rate</div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {!selectedHistoryAsset && (
          <div className="text-center py-12">
            <div className="bg-gray-100 p-4 rounded-lg inline-block mb-4">
              <History className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Select an Asset</h3>
            <p className="text-gray-600">
              Choose an asset from the dropdown above to view its complete lifecycle history.
            </p>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      <Dialog open={!!selectedHistoryEvent} onOpenChange={() => setSelectedHistoryEvent(null)}>
        <DialogContent className="max-w-2xl">
          {selectedHistoryEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-3">
                  {getEventIcon(selectedHistoryEvent.type)}
                  <div>
                    <div>{selectedHistoryEvent.title}</div>
                    <div className="text-sm text-gray-600 font-normal">
                      {new Date(selectedHistoryEvent.date).toLocaleDateString()}
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription>Detailed information about this lifecycle event</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Event Type</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getEventIcon(selectedHistoryEvent.type)}
                      <span className="capitalize">{selectedHistoryEvent.type.replace("-", " ")}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(selectedHistoryEvent.status)}
                      <span className="capitalize">{selectedHistoryEvent.status}</span>
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <div className="mt-1">{new Date(selectedHistoryEvent.date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <div className="flex items-center space-x-1 mt-1">
                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                      <span>{selectedHistoryEvent.location}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-gray-700">{selectedHistoryEvent.description}</p>
                </div>

                {selectedHistoryEvent.amount != null && selectedHistoryEvent.amount !== 0 && (
                  <div>
                    <Label>Financial Impact</Label>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        selectedHistoryEvent.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {selectedHistoryEvent.amount > 0 ? "+" : ""}
                      <CurrencyValue amount={Math.abs(selectedHistoryEvent.amount)} />
                    </div>
                  </div>
                )}

                {selectedHistoryEvent.details && (
                  <div>
                    <Label>Additional Details</Label>
                    <div className="mt-2 space-y-2">
                      {Object.entries(selectedHistoryEvent.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-1 border-b border-gray-100">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
                          <span>{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
