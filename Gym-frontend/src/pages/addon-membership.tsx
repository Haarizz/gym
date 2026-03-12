import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import {
  Search,
  ShoppingCart,
  Spa,
  Dumbbell,
  Users,
  Coffee,
  Zap,
  Calendar,
} from "lucide-react";

// Mock data for active members
const members = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+1-234-567-8901",
    currentPlan: "Basic Monthly",
    activeAddons: ["Personal Training"],
    totalSpent: "$450",
  },
  {
    id: 2,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1-234-567-8902",
    currentPlan: "Premium Monthly",
    activeAddons: ["Spa Access", "Nutrition Consultation"],
    totalSpent: "$720",
  },
  {
    id: 3,
    name: "Mike Wilson",
    email: "mike.wilson@email.com",
    phone: "+1-234-567-8903",
    currentPlan: "Basic Annual",
    activeAddons: [],
    totalSpent: "$600",
  },
  {
    id: 4,
    name: "Emily Davis",
    email: "emily.davis@email.com",
    phone: "+1-234-567-8904",
    currentPlan: "Premium Monthly",
    activeAddons: ["Group Classes"],
    totalSpent: "$540",
  },
];

const addonServices = [
  {
    id: "personal-training",
    name: "Personal Training",
    description:
      "One-on-one training sessions with certified trainers",
    icon: Dumbbell,
    pricing: [
      { sessions: 4, price: "$200", duration: "1 month" },
      { sessions: 8, price: "$380", duration: "1 month" },
      { sessions: 12, price: "$540", duration: "1 month" },
    ],
    category: "Fitness",
  },
  {
    id: "spa-access",
    name: "Spa Access",
    description:
      "Full access to spa facilities including sauna, steam room, and massage",
    icon: Spa,
    pricing: [
      {
        sessions: "Unlimited",
        price: "$80",
        duration: "1 month",
      },
      {
        sessions: "Unlimited",
        price: "$220",
        duration: "3 months",
      },
      {
        sessions: "Unlimited",
        price: "$800",
        duration: "12 months",
      },
    ],
    category: "Wellness",
  },
  {
    id: "group-classes",
    name: "Group Classes",
    description:
      "Access to yoga, pilates, spinning, and other group fitness classes",
    icon: Users,
    pricing: [
      { sessions: 8, price: "$120", duration: "1 month" },
      { sessions: 16, price: "$220", duration: "1 month" },
      {
        sessions: "Unlimited",
        price: "$300",
        duration: "1 month",
      },
    ],
    category: "Fitness",
  },
  {
    id: "nutrition-consultation",
    name: "Nutrition Consultation",
    description:
      "Professional dietary guidance and meal planning",
    icon: Coffee,
    pricing: [
      { sessions: 1, price: "$100", duration: "One-time" },
      { sessions: 3, price: "$270", duration: "3 months" },
      { sessions: 6, price: "$500", duration: "6 months" },
    ],
    category: "Wellness",
  },
  {
    id: "recovery-suite",
    name: "Recovery Suite",
    description:
      "Access to cryotherapy, infrared sauna, and compression therapy",
    icon: Zap,
    pricing: [
      { sessions: 4, price: "$160", duration: "1 month" },
      { sessions: 8, price: "$300", duration: "1 month" },
      {
        sessions: "Unlimited",
        price: "$400",
        duration: "1 month",
      },
    ],
    category: "Recovery",
  },
  {
    id: "childcare",
    name: "Childcare Services",
    description: "Professional childcare while you work out",
    icon: Calendar,
    pricing: [
      { sessions: 8, price: "$80", duration: "1 month" },
      { sessions: 16, price: "$150", duration: "1 month" },
      {
        sessions: "Unlimited",
        price: "$200",
        duration: "1 month",
      },
    ],
    category: "Services",
  },
];

export function AddonMembership() {
  const [selectedMember, setSelectedMember] =
    useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<{
    [key: string]: any;
  }>({});
  const [notes, setNotes] = useState("");

  const filteredMembers = members.filter(
    (member) =>
      member.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      member.email
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const handleAddonToggle = (
    addonId: string,
    pricingOption: any,
  ) => {
    setSelectedAddons((prev) => ({
      ...prev,
      [addonId]: prev[addonId] ? null : pricingOption,
    }));
  };

  const calculateTotal = () => {
    return Object.values(selectedAddons).reduce(
      (total: number, addon: any) => {
        return (
          total +
          (addon ? parseFloat(addon.price.replace("$", "")) : 0)
        );
      },
      0,
    );
  };

  const processAddons = () => {
    console.log(
      "Processing add-ons for:",
      selectedMember?.name,
    );
    console.log("Selected add-ons:", selectedAddons);
    console.log("Total:", calculateTotal());
    console.log("Notes:", notes);
    setSelectedMember(null);
    setSelectedAddons({});
    setNotes("");
  };

  const getIconComponent = (IconComponent: any) =>
    IconComponent;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Add-on Membership
          </h1>
          <p className="text-muted-foreground">
            Attach extra services to active memberships
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Add-ons
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,240</div>
            <p className="text-xs text-muted-foreground">
              From add-ons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Popular Service
            </CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PT</div>
            <p className="text-xs text-muted-foreground">
              Personal Training
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">65%</div>
            <p className="text-xs text-muted-foreground">
              Members with add-ons
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Member</CardTitle>
          <CardDescription>
            Choose a member to add services to their membership
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Active Add-ons</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {member.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.currentPlan}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.activeAddons.length > 0 ? (
                          member.activeAddons.map(
                            (addon, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {addon}
                              </Badge>
                            ),
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            None
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{member.totalSpent}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() =>
                          setSelectedMember(member)
                        }
                      >
                        Add Services
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add-on Selection Dialog */}
      <Dialog
        open={!!selectedMember}
        onOpenChange={() => setSelectedMember(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Services</DialogTitle>
            <DialogDescription>
              Select add-on services for {selectedMember?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Member Info */}
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">
                Member Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span>{" "}
                  {selectedMember?.name}
                </div>
                <div>
                  <span className="font-medium">
                    Current Plan:
                  </span>{" "}
                  {selectedMember?.currentPlan}
                </div>
                <div>
                  <span className="font-medium">
                    Active Add-ons:
                  </span>
                  {selectedMember?.activeAddons.length > 0 ? (
                    <span className="ml-2">
                      {selectedMember?.activeAddons.join(", ")}
                    </span>
                  ) : (
                    <span className="ml-2 text-muted-foreground">
                      None
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-medium">
                    Total Spent:
                  </span>{" "}
                  {selectedMember?.totalSpent}
                </div>
              </div>
            </div>

            {/* Available Services */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Available Services
              </h3>
              <div className="grid gap-4">
                {addonServices.map((service) => {
                  const IconComponent = getIconComponent(
                    service.icon,
                  );
                  return (
                    <Card key={service.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">
                              {service.name}
                            </h4>
                            <Badge variant="outline">
                              {service.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {service.description}
                          </p>
                          <div className="grid gap-2">
                            <Label className="text-sm font-medium">
                              Pricing Options:
                            </Label>
                            {service.pricing.map(
                              (option, index) => (
                                <div
                                  key={index}
                                  className="flex items-center space-x-3"
                                >
                                  <Checkbox
                                    id={`${service.id}-${index}`}
                                    checked={
                                      selectedAddons[
                                        service.id
                                      ] === option
                                    }
                                    onCheckedChange={() =>
                                      handleAddonToggle(
                                        service.id,
                                        option,
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={`${service.id}-${index}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    {option.sessions} sessions -{" "}
                                    {option.price} (
                                    {option.duration})
                                  </Label>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about these add-ons..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Summary */}
            {Object.keys(selectedAddons).some(
              (key) => selectedAddons[key],
            ) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">
                  Selected Services Summary
                </h4>
                <div className="space-y-2">
                  {Object.entries(selectedAddons).map(
                    ([addonId, option]) => {
                      if (!option) return null;
                      const service = addonServices.find(
                        (s) => s.id === addonId,
                      );
                      return (
                        <div
                          key={addonId}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {service?.name} ({option.sessions}{" "}
                            sessions - {option.duration})
                          </span>
                          <span className="font-medium">
                            {option.price}
                          </span>
                        </div>
                      );
                    },
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>${calculateTotal()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedMember(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={processAddons}
                disabled={
                  !Object.keys(selectedAddons).some(
                    (key) => selectedAddons[key],
                  )
                }
              >
                Add Services (${calculateTotal()})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

