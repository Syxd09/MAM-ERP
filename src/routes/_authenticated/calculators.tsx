import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inr } from "@/lib/erp";
import { Calculator, Flame, Wrench, Zap, Paintbrush, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calculators")({
  head: () => ({ meta: [{ title: "Cost Calculators — MAM ERP" }] }),
  component: CalculatorsPage,
});

/** Material library: density (g/cm³) and default ₹/kg market rate. */
const MATERIALS: Record<string, { label: string; density: number; rate: number }> = {
  MS: { label: "Mild Steel (MS)", density: 7.85, rate: 70 },
  MS_CR: { label: "MS — Cold Rolled (CRCA)", density: 7.85, rate: 85 },
  MS_HR: { label: "MS — Hot Rolled (HR)", density: 7.85, rate: 65 },
  GI: { label: "Galvanised Iron (GI)", density: 7.85, rate: 95 },
  SS_304: { label: "Stainless Steel 304", density: 8.0, rate: 260 },
  SS_316: { label: "Stainless Steel 316", density: 8.0, rate: 360 },
  SS_202: { label: "Stainless Steel 202", density: 7.86, rate: 200 },
  AL: { label: "Aluminium 1100", density: 2.71, rate: 280 },
  AL_6061: { label: "Aluminium 6061", density: 2.7, rate: 340 },
  AL_5052: { label: "Aluminium 5052", density: 2.68, rate: 320 },
  BRASS: { label: "Brass", density: 8.5, rate: 620 },
  COPPER: { label: "Copper", density: 8.96, rate: 780 },
  TITANIUM: { label: "Titanium Grade 2", density: 4.51, rate: 2800 },
  ACRYLIC: { label: "Acrylic / PMMA", density: 1.18, rate: 350 },
  MDF: { label: "MDF Board", density: 0.75, rate: 90 },
  PLYWOOD: { label: "Plywood", density: 0.6, rate: 75 },
  ACP: { label: "ACP Sheet", density: 1.5, rate: 180 },
};

function CalculatorsPage() {
  return (
    <div className="space-y-6">
      <div className="panel p-5 relative overflow-hidden bg-card border border-border rounded-sm shadow-sm">
        <div className="relative">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-3">
            <span className="size-9 rounded-sm bg-primary flex items-center justify-center">
              <Calculator className="size-4.5 text-primary-foreground" />
            </span>
            Fabrication Cost Calculators
          </h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-2xl">
            Pre-loaded with <span className="font-semibold text-foreground">17 materials</span> ·
            live cost breakdown across material, machine, labour, consumables & margin.
          </p>
        </div>
      </div>

      <Tabs defaultValue="laser" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="laser">
            <Zap className="size-4 mr-1.5" /> Laser Cutting
          </TabsTrigger>
          <TabsTrigger value="bending">
            <Wrench className="size-4 mr-1.5" /> Bending
          </TabsTrigger>
          <TabsTrigger value="welding">
            <Flame className="size-4 mr-1.5" /> Welding
          </TabsTrigger>
          <TabsTrigger value="laser_marking">
            <Sparkles className="size-4 mr-1.5" /> Laser Marking
          </TabsTrigger>
          <TabsTrigger value="powder">
            <Paintbrush className="size-4 mr-1.5" /> Powder Coating
          </TabsTrigger>
        </TabsList>
        <TabsContent value="laser">
          <LaserCalc />
        </TabsContent>
        <TabsContent value="bending">
          <BendingCalc />
        </TabsContent>
        <TabsContent value="welding">
          <WeldingCalc />
        </TabsContent>
        <TabsContent value="laser_marking">
          <LaserMarkingCalc />
        </TabsContent>
        <TabsContent value="powder">
          <PowderCoatCalc />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NumberField({
  label,
  value,
  set,
  unit,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
  unit?: string;
}) {
  return (
    <div>
      <Label className="text-xs">
        {label}
        {unit && <span className="text-muted-foreground"> ({unit})</span>}
      </Label>
      <Input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="font-mono"
      />
    </div>
  );
}

function MaterialSelect({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div>
      <Label className="text-xs">Material</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {Object.entries(MATERIALS).map(([k, m]) => (
            <SelectItem key={k} value={k}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ResultRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 border-b border-border/60 ${bold ? "border-t-2 border-primary pt-3 mt-3 border-b-0" : ""}`}
    >
      <span
        className={`text-xs ${bold ? "font-bold uppercase tracking-wider" : "text-muted-foreground"}`}
      >
        {label}
      </span>
      <span
        className={`font-mono ${bold ? "text-lg font-bold text-foreground" : accent ? "text-primary font-semibold" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

function LaserCalc() {
  const [s, setS] = useState({
    material: "MS",
    thickness: 5,
    plateW: 1500,
    plateH: 3000,
    materialRate: MATERIALS.MS.rate,
    cutTime: 8,
    moveTime: 2,
    pierceTime: 1,
    processTime: 1,
    machineRate: 1500,
    labourRate: 250,
    marginPct: 25,
    wastagePct: 8,
  });
  function setMaterial(key: string) {
    setS({ ...s, material: key, materialRate: MATERIALS[key].rate });
  }
  const result = useMemo(() => {
    const density = MATERIALS[s.material].density;
    const weightKg = (s.plateW * s.plateH * s.thickness * density) / 1_000_000;
    const wastage = weightKg * (s.wastagePct / 100);
    const rawMaterial = (weightKg + wastage) * s.materialRate;
    const totalMinutes = s.cutTime + s.moveTime + s.pierceTime + s.processTime;
    const machineCost = (totalMinutes / 60) * s.machineRate;
    const labourCost = (totalMinutes / 60) * s.labourRate;
    const totalCost = rawMaterial + machineCost + labourCost;
    const profit = (totalCost * s.marginPct) / 100;
    return {
      weightKg,
      wastage,
      rawMaterial,
      machineCost,
      labourCost,
      totalCost,
      profit,
      sellingPrice: totalCost + profit,
    };
  }, [s]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="panel p-5 lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MaterialSelect value={s.material} onChange={setMaterial} />
          <NumberField
            label="Thickness"
            unit="mm"
            value={s.thickness}
            set={(v) => setS({ ...s, thickness: v })}
          />
          <NumberField
            label="Material rate"
            unit="₹/kg"
            value={s.materialRate}
            set={(v) => setS({ ...s, materialRate: v })}
          />
          <NumberField
            label="Plate width"
            unit="mm"
            value={s.plateW}
            set={(v) => setS({ ...s, plateW: v })}
          />
          <NumberField
            label="Plate height"
            unit="mm"
            value={s.plateH}
            set={(v) => setS({ ...s, plateH: v })}
          />
          <NumberField
            label="Wastage"
            unit="%"
            value={s.wastagePct}
            set={(v) => setS({ ...s, wastagePct: v })}
          />
          <NumberField
            label="Cut time"
            unit="min"
            value={s.cutTime}
            set={(v) => setS({ ...s, cutTime: v })}
          />
          <NumberField
            label="Move time"
            unit="min"
            value={s.moveTime}
            set={(v) => setS({ ...s, moveTime: v })}
          />
          <NumberField
            label="Pierce time"
            unit="min"
            value={s.pierceTime}
            set={(v) => setS({ ...s, pierceTime: v })}
          />
          <NumberField
            label="Process time"
            unit="min"
            value={s.processTime}
            set={(v) => setS({ ...s, processTime: v })}
          />
          <NumberField
            label="Labour rate"
            unit="₹/hr"
            value={s.labourRate}
            set={(v) => setS({ ...s, labourRate: v })}
          />
          <NumberField
            label="Profit margin"
            unit="%"
            value={s.marginPct}
            set={(v) => setS({ ...s, marginPct: v })}
          />
        </div>
      </div>
      <div className="panel-elevated p-5 self-start">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <Zap className="size-4 text-primary" /> Cost Breakdown
        </h3>
        <ResultRow label="Material weight" value={`${result.weightKg.toFixed(2)} kg`} />
        <ResultRow label={`Wastage (${s.wastagePct}%)`} value={`${result.wastage.toFixed(2)} kg`} />
        <ResultRow label="Raw material cost" value={inr(result.rawMaterial)} accent />
        <ResultRow label="Machine cost" value={inr(result.machineCost)} />
        <ResultRow label="Labour cost" value={inr(result.labourCost)} />
        <ResultRow label="Total cost" value={inr(result.totalCost)} />
        <ResultRow label={`Profit (${s.marginPct}%)`} value={inr(result.profit)} accent />
        <ResultRow label="Quotation price" value={inr(result.sellingPrice)} bold />
      </div>
    </div>
  );
}

function BendingCalc() {
  const [s, setS] = useState({
    material: "MS",
    bends: 10,
    thickness: 1,
    length: 1000,
    materialCost: 0,
    marginPct: 25,
  });
  const result = useMemo(() => {
    const isSS = s.material.startsWith("SS") || s.material === "BRASS" || s.material === "COPPER" || s.material === "TITANIUM";
    let baseRate = 6; // default MS/AL/GI 1mm
    if (isSS) {
      if (s.thickness <= 1) {
        baseRate = 10;
      } else if (s.thickness <= 2) {
        baseRate = 13;
      } else {
        baseRate = 13 + (s.thickness - 2) * 5;
      }
    } else {
      if (s.thickness <= 1) {
        baseRate = 6;
      } else if (s.thickness <= 2) {
        baseRate = 8;
      } else {
        baseRate = 8 + (s.thickness - 2) * 3;
      }
    }

    let premium = 0;
    if (s.length > 2000) {
      if (s.length <= 3000) premium = 5;
      else if (s.length <= 4000) premium = 7;
      else premium = 10;
    }

    const ratePerBend = baseRate + premium;
    const bendingCost = ratePerBend * s.bends;
    const total = s.materialCost + bendingCost;
    const profit = (total * s.marginPct) / 100;
    return {
      ratePerBend,
      bendingCost,
      total,
      profit,
      price: total + profit
    };
  }, [s]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="panel p-5 lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
        <MaterialSelect value={s.material} onChange={(v) => setS({ ...s, material: v })} />
        <NumberField
          label="Number of bends"
          value={s.bends}
          set={(v) => setS({ ...s, bends: v })}
        />
        <NumberField
          label="Thickness"
          unit="mm"
          value={s.thickness}
          set={(v) => setS({ ...s, thickness: v })}
        />
        <NumberField
          label="Length"
          unit="mm"
          value={s.length}
          set={(v) => setS({ ...s, length: v })}
        />
        <NumberField
          label="Material cost"
          unit="₹"
          value={s.materialCost}
          set={(v) => setS({ ...s, materialCost: v })}
        />
        <NumberField
          label="Profit margin"
          unit="%"
          value={s.marginPct}
          set={(v) => setS({ ...s, marginPct: v })}
        />
      </div>
      <div className="panel-elevated p-5 self-start">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <Wrench className="size-4 text-primary" /> Cost Breakdown
        </h3>
        <ResultRow label="Rate per bend" value={inr(result.ratePerBend)} />
        <ResultRow label="Total bending cost" value={inr(result.bendingCost)} accent />
        <ResultRow label="Material cost" value={inr(s.materialCost)} />
        <ResultRow label="Total cost" value={inr(result.total)} />
        <ResultRow label={`Profit (${s.marginPct}%)`} value={inr(result.profit)} accent />
        <ResultRow label="Final price" value={inr(result.price)} bold />
      </div>
    </div>
  );
}

function WeldingCalc() {
  const [s, setS] = useState({
    material: "MS",
    type: "MIG",
    lengthMm: 1000,
    hours: 2,
    materialCost: 500,
    machineRate: 800,
    labourRate: 300,
    consumablePerM: 30,
    gasPerHr: 80,
    marginPct: 25,
  });
  const result = useMemo(() => {
    const machineCost = s.hours * s.machineRate;
    const labourCost = s.hours * s.labourRate;
    const consumable = (s.lengthMm / 1000) * s.consumablePerM;
    const gas = s.hours * s.gasPerHr;
    const total = s.materialCost + machineCost + labourCost + consumable + gas;
    const profit = (total * s.marginPct) / 100;
    return { machineCost, labourCost, consumable, gas, total, profit, price: total + profit };
  }, [s]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="panel p-5 lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
        <MaterialSelect value={s.material} onChange={(v) => setS({ ...s, material: v })} />
        <div>
          <Label className="text-xs">Welding type</Label>
          <Select value={s.type} onValueChange={(v) => setS({ ...s, type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MIG">MIG</SelectItem>
              <SelectItem value="TIG">TIG</SelectItem>
              <SelectItem value="CO2">CO₂</SelectItem>
              <SelectItem value="ARC">ARC / Stick</SelectItem>
              <SelectItem value="SPOT">Spot</SelectItem>
              <SelectItem value="LASER">Laser Welding</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NumberField
          label="Welding length"
          unit="mm"
          value={s.lengthMm}
          set={(v) => setS({ ...s, lengthMm: v })}
        />
        <NumberField
          label="Estimated hours"
          value={s.hours}
          set={(v) => setS({ ...s, hours: v })}
        />
        <NumberField
          label="Material cost"
          unit="₹"
          value={s.materialCost}
          set={(v) => setS({ ...s, materialCost: v })}
        />
        <NumberField
          label="Machine rate"
          unit="₹/hr"
          value={s.machineRate}
          set={(v) => setS({ ...s, machineRate: v })}
        />
        <NumberField
          label="Labour rate"
          unit="₹/hr"
          value={s.labourRate}
          set={(v) => setS({ ...s, labourRate: v })}
        />
        <NumberField
          label="Consumable"
          unit="₹/m"
          value={s.consumablePerM}
          set={(v) => setS({ ...s, consumablePerM: v })}
        />
        <NumberField
          label="Gas / Power"
          unit="₹/hr"
          value={s.gasPerHr}
          set={(v) => setS({ ...s, gasPerHr: v })}
        />
        <NumberField
          label="Profit margin"
          unit="%"
          value={s.marginPct}
          set={(v) => setS({ ...s, marginPct: v })}
        />
      </div>
      <div className="panel-elevated p-5 self-start">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <Flame className="size-4 text-primary" /> Cost Breakdown
        </h3>
        <ResultRow label="Machine cost" value={inr(result.machineCost)} />
        <ResultRow label="Labour cost" value={inr(result.labourCost)} />
        <ResultRow label="Consumable cost" value={inr(result.consumable)} />
        <ResultRow label="Gas / power" value={inr(result.gas)} />
        <ResultRow label="Total cost" value={inr(result.total)} />
        <ResultRow label={`Profit (${s.marginPct}%)`} value={inr(result.profit)} accent />
        <ResultRow label="Final price" value={inr(result.price)} bold />
      </div>
    </div>
  );
}

function LaserMarkingCalc() {
  const [s, setS] = useState({
    material: "SS_304",
    areaCm2: 50,
    depth: 0.3,
    passes: 2,
    machineMin: 15,
    machineRate: 900,
    labourRate: 250,
    setupCost: 150,
    marginPct: 30,
  });
  const result = useMemo(() => {
    const totalMin = s.machineMin * s.passes;
    const machineCost = (totalMin / 60) * s.machineRate;
    const labourCost = (totalMin / 60) * s.labourRate;
    const total = s.setupCost + machineCost + labourCost;
    const profit = (total * s.marginPct) / 100;
    return { totalMin, machineCost, labourCost, total, profit, price: total + profit };
  }, [s]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="panel p-5 lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
        <MaterialSelect value={s.material} onChange={(v) => setS({ ...s, material: v })} />
        <NumberField
          label="Marking area"
          unit="cm²"
          value={s.areaCm2}
          set={(v) => setS({ ...s, areaCm2: v })}
        />
        <NumberField
          label="Depth"
          unit="mm"
          value={s.depth}
          set={(v) => setS({ ...s, depth: v })}
        />
        <NumberField label="Passes" value={s.passes} set={(v) => setS({ ...s, passes: v })} />
        <NumberField
          label="Time / pass"
          unit="min"
          value={s.machineMin}
          set={(v) => setS({ ...s, machineMin: v })}
        />
        <NumberField
          label="Setup cost"
          unit="₹"
          value={s.setupCost}
          set={(v) => setS({ ...s, setupCost: v })}
        />
        <NumberField
          label="Machine rate"
          unit="₹/hr"
          value={s.machineRate}
          set={(v) => setS({ ...s, machineRate: v })}
        />
        <NumberField
          label="Labour rate"
          unit="₹/hr"
          value={s.labourRate}
          set={(v) => setS({ ...s, labourRate: v })}
        />
        <NumberField
          label="Profit margin"
          unit="%"
          value={s.marginPct}
          set={(v) => setS({ ...s, marginPct: v })}
        />
      </div>
      <div className="panel-elevated p-5 self-start">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> Cost Breakdown
        </h3>
        <ResultRow label="Total minutes" value={`${result.totalMin} min`} />
        <ResultRow label="Machine cost" value={inr(result.machineCost)} />
        <ResultRow label="Labour cost" value={inr(result.labourCost)} />
        <ResultRow label="Setup cost" value={inr(s.setupCost)} />
        <ResultRow label="Total cost" value={inr(result.total)} />
        <ResultRow label={`Profit (${s.marginPct}%)`} value={inr(result.profit)} accent />
        <ResultRow label="Final price" value={inr(result.price)} bold />
      </div>
    </div>
  );
}

function PowderCoatCalc() {
  const [s, setS] = useState({
    areaSqFt: 50,
    ratePerSqFt: 35,
    color: "Standard",
    powderKgPerSqFt: 0.018,
    powderRate: 350,
    labourRate: 250,
    hours: 1.5,
    ovenCost: 200,
    marginPct: 25,
  });
  const result = useMemo(() => {
    const baseCost = s.areaSqFt * s.ratePerSqFt;
    const powderKg = s.areaSqFt * s.powderKgPerSqFt;
    const powderCost = powderKg * s.powderRate;
    const labourCost = s.hours * s.labourRate;
    const total = baseCost + powderCost + labourCost + s.ovenCost;
    const profit = (total * s.marginPct) / 100;
    return { baseCost, powderKg, powderCost, labourCost, total, profit, price: total + profit };
  }, [s]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="panel p-5 lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
        <NumberField
          label="Area"
          unit="sq.ft"
          value={s.areaSqFt}
          set={(v) => setS({ ...s, areaSqFt: v })}
        />
        <NumberField
          label="Rate / sq.ft"
          unit="₹"
          value={s.ratePerSqFt}
          set={(v) => setS({ ...s, ratePerSqFt: v })}
        />
        <div>
          <Label className="text-xs">Finish</Label>
          <Select value={s.color} onValueChange={(v) => setS({ ...s, color: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Standard">Standard RAL</SelectItem>
              <SelectItem value="Metallic">Metallic</SelectItem>
              <SelectItem value="Textured">Textured</SelectItem>
              <SelectItem value="Matt">Matt</SelectItem>
              <SelectItem value="Glossy">Glossy</SelectItem>
              <SelectItem value="Anti-corrosive">Anti-corrosive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NumberField
          label="Powder usage"
          unit="kg/sq.ft"
          value={s.powderKgPerSqFt}
          set={(v) => setS({ ...s, powderKgPerSqFt: v })}
        />
        <NumberField
          label="Powder rate"
          unit="₹/kg"
          value={s.powderRate}
          set={(v) => setS({ ...s, powderRate: v })}
        />
        <NumberField label="Labour hours" value={s.hours} set={(v) => setS({ ...s, hours: v })} />
        <NumberField
          label="Labour rate"
          unit="₹/hr"
          value={s.labourRate}
          set={(v) => setS({ ...s, labourRate: v })}
        />
        <NumberField
          label="Oven / curing"
          unit="₹"
          value={s.ovenCost}
          set={(v) => setS({ ...s, ovenCost: v })}
        />
        <NumberField
          label="Profit margin"
          unit="%"
          value={s.marginPct}
          set={(v) => setS({ ...s, marginPct: v })}
        />
      </div>
      <div className="panel-elevated p-5 self-start">
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <Paintbrush className="size-4 text-primary" /> Cost Breakdown
        </h3>
        <ResultRow label="Area cost" value={inr(result.baseCost)} />
        <ResultRow
          label={`Powder (${result.powderKg.toFixed(2)} kg)`}
          value={inr(result.powderCost)}
        />
        <ResultRow label="Labour cost" value={inr(result.labourCost)} />
        <ResultRow label="Oven / curing" value={inr(s.ovenCost)} />
        <ResultRow label="Total cost" value={inr(result.total)} />
        <ResultRow label={`Profit (${s.marginPct}%)`} value={inr(result.profit)} accent />
        <ResultRow label="Final price" value={inr(result.price)} bold />
      </div>
    </div>
  );
}
