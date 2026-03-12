import React, { useState } from "react";
import { Button } from "../ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { X, Plus } from "lucide-react";
import { Rule } from "../../utils/policyRuleEngine";

interface PolicyRuleBuilderProps {
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

// Simple ID generator
const generateId = () => `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function PolicyRuleBuilder({ rules, onChange }: PolicyRuleBuilderProps) {
  const updateRules = (newRules: Rule[]) => {
    onChange(newRules);
  };

  const addRule = () => {
    const newRule: Rule = {
      id: generateId(),
      conditionType: "membership_type",
      conditionValue: "",
      rewardDays: 1,
    };
    updateRules([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    updateRules(rules.filter((r) => r.id !== id));
  };

  const updateRule = (id: string, key: keyof Rule, value: any) => {
    updateRules(
      rules.map((r) =>
        r.id === id ? { ...r, [key]: value } : r
      )
    );
  };

  return (
    <div className="space-y-4 bg-gradient-to-br from-[#2B7A78]/5 to-transparent p-6 rounded-lg border-2 border-[#2B7A78]/20">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-[#1E293B]">
            Configure Access Days Rules
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Define conditions and reward days for eligible members
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={addRule}
          className="bg-[#2B7A78] hover:bg-[#2B7A78]/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-[#2B7A78]/20 rounded-lg bg-white/50">
          <p className="text-sm text-muted-foreground">No rules added yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add Rule" to create your first eligibility rule</p>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div
            key={rule.id}
            className="p-5 bg-white border-2 border-[#2B7A78]/10 rounded-lg space-y-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2B7A78] text-white flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
                <h5 className="font-medium text-[#1E293B]">Rule #{index + 1}</h5>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#E63946] hover:text-[#E63946]/80 hover:bg-[#E63946]/10"
                onClick={() => removeRule(rule.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Condition Type */}
              <div className="space-y-2">
                <Label htmlFor={`condition-${rule.id}`} className="text-sm font-medium text-[#1E293B]">
                  Condition Type
                </Label>
                <Select
                  value={rule.conditionType}
                  onValueChange={(val) =>
                    updateRule(rule.id, "conditionType", val as any)
                  }
                >
                  <SelectTrigger id={`condition-${rule.id}`}>
                    <SelectValue placeholder="Select Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="membership_type">
                      Membership Type
                    </SelectItem>
                    <SelectItem value="package_duration">
                      Package Duration (Months)
                    </SelectItem>
                    <SelectItem value="renewal_count">
                      Renewal Count
                    </SelectItem>
                    <SelectItem value="first_x_members">
                      First X Members
                    </SelectItem>
                    <SelectItem value="tenure_days">
                      Member Tenure Days
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Field Rendering */}
              {rule.conditionType === "membership_type" && (
                <div className="space-y-2">
                  <Label htmlFor={`value-${rule.id}`} className="text-sm font-medium text-[#1E293B]">
                    Membership Type
                  </Label>
                  <Select
                    value={rule.conditionValue}
                    onValueChange={(val) =>
                      updateRule(rule.id, "conditionValue", val)
                    }
                  >
                    <SelectTrigger id={`value-${rule.id}`}>
                      <SelectValue placeholder="Choose Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {rule.conditionType === "package_duration" && (
                <div className="space-y-2">
                  <Label htmlFor={`value-${rule.id}`} className="text-sm font-medium text-[#1E293B]">
                    Minimum Months
                  </Label>
                  <Input
                    id={`value-${rule.id}`}
                    type="number"
                    min="1"
                    value={rule.conditionValue || ''}
                    onChange={(e) =>
                      updateRule(rule.id, "conditionValue", e.target.value)
                    }
                    placeholder="e.g., 3"
                  />
                </div>
              )}

              {rule.conditionType === "renewal_count" && (
                <div className="space-y-2">
                  <Label htmlFor={`value-${rule.id}`} className="text-sm font-medium text-[#1E293B]">
                    Minimum Renewal Count
                  </Label>
                  <Input
                    id={`value-${rule.id}`}
                    type="number"
                    min="1"
                    value={rule.conditionValue || ''}
                    onChange={(e) =>
                      updateRule(rule.id, "conditionValue", e.target.value)
                    }
                    placeholder="e.g., 2"
                  />
                </div>
              )}

              {rule.conditionType === "first_x_members" && (
                <div className="space-y-2">
                  <Label htmlFor={`value-${rule.id}`} className="text-sm font-medium text-[#1E293B]">
                    Member Limit
                  </Label>
                  <Input
                    id={`value-${rule.id}`}
                    type="number"
                    min="1"
                    value={rule.conditionValue || ''}
                    onChange={(e) =>
                      updateRule(rule.id, "conditionValue", e.target.value)
                    }
                    placeholder="e.g., 100"
                  />
                </div>
              )}

              {rule.conditionType === "tenure_days" && (
                <div className="space-y-2">
                  <Label htmlFor={`value-${rule.id}`} className="text-sm font-medium text-[#1E293B]">
                    Minimum Days Since Joining
                  </Label>
                  <Input
                    id={`value-${rule.id}`}
                    type="number"
                    min="1"
                    value={rule.conditionValue || ''}
                    onChange={(e) =>
                      updateRule(rule.id, "conditionValue", e.target.value)
                    }
                    placeholder="e.g., 90"
                  />
                </div>
              )}
            </div>

            {/* Reward Days */}
            <div className="pt-3 border-t border-[#2B7A78]/10">
              <Label htmlFor={`reward-${rule.id}`} className="text-sm font-medium text-[#1E293B]">
                Reward Days
              </Label>
              <div className="flex items-center gap-3 mt-2">
                <Input
                  id={`reward-${rule.id}`}
                  type="number"
                  min="1"
                  value={rule.rewardDays || ''}
                  onChange={(e) =>
                    updateRule(rule.id, "rewardDays", Number(e.target.value))
                  }
                  placeholder="Enter days"
                  className="max-w-[200px]"
                />
                <span className="text-sm text-muted-foreground">
                  extra days will be added to membership
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

