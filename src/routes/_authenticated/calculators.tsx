import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inr } from "@/lib/erp";
import { Calculator, Flame, Wrench, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calculators")({
  head: () => ({ meta: [{ title: "Cost Calculators — MAM ERP" }] }),
  component: CalculatorsPage,
});

function CalculatorsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Calculator className="size-7 text-primary" /> Fabrication Cost Calculators</h1>
        <p className="text-sm text-muted-foreground mt-1">Estimate selling price with material, machine, labour and margin.</p>
      </div>

      <Tabs defaultValue="laser" className="space-y-4">
        <TabsList>
          <TabsTrigger value="laser"><Zap className="size-4 mr-1" /> Laser Cutting</TabsTrigger>
          <TabsTrigger value="bending"><Wrench className="size-4 mr-1" /> Bending</TabsTrigger>
          <TabsTrigger value="welding"><Flame className="size-4 mr-1" /> Welding</TabsTrigger>
        </TabsList>
        <TabsContent value="laser"><LaserCalc /></TabsContent>
        <TabsContent value="bending"><BendingCalc /></TabsContent>
        <TabsContent value="welding"><WeldingCalc /></TabsContent>
      </Tabs>
    </div>
  );
}

function NumberField({ label, value, set, unit }: { label: string; value: number; set: (n: number) => void; unit?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}{unit && <span className="text-muted-foreground"> ({unit})</span>}</Label>
      <Input type="number" min="0" step="any" value={value} onChange={e => set(Number(e.target.value))} />
    </div>
  );
}

function ResultRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-border/40 ${bold ? "border-t border-primary/40 pt-3 mt-2" : ""}`}>
      <span className={`text-sm ${bold ? "font-display font-bold" : "text-muted-foreground"}`}>{label}</span>
      <span className={`font-mono ${bold ? "text-lg font-bold text-gradient" : ""}`}>{value}</span>
    </div>
  );
}

function LaserCalc() {
  const [s, setS] = useState({
    material: "MS", thickness: 5, plateW: 1500, plateH: 3000, materialRate: 70, // ₹/kg
    cutLen: 5000, moveLen: 1500, pierceCount: 80,
    cutTime: 8, moveTime: 2, pierceTime: 1, processTime: 1,
    machineRate: 1500, labourRate: 250, marginPct: 25,
  });
  const result = useMemo(() => {
    const density = s.material === "SS" ? 8.0 : s.material === "AL" ? 2.7 : 7.85;
    const weightKg = (s.plateW * s.plateH * s.thickness * density) / 1_000_000;
    const rawMaterial = weightKg * s.materialRate;
    const totalMinutes = s.cutTime + s.moveTime + s.pierceTime + s.processTime;
    const machineCost = (totalMinutes / 60) * s.machineRate;
    const labourCost = (totalMinutes / 60) * s.labourRate;
    const totalCost = rawMaterial + machineCost + labourCost;
    const profit = (totalCost * s.marginPct) / 100;
    const sellingPrice = totalCost + profit;
    return { weightKg, rawMaterial, machineCost, labourCost, totalCost, profit, sellingPrice };
  }, [s]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="panel p-5 lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Material</Label>
            <Select value={s.material} onValueChange={v => setS({ ...s, material: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MS">Mild Steel</SelectItem><SelectItem value="SS">Stainless Steel</SelectItem><SelectItem value="AL">Aluminium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumberField label="Thickness" unit="mm" value={s.thickness} set={v => setS({ ...s, thickness: v })} />
          <NumberField label="Material rate" unit="₹/kg" value={s.materialRate} set={v => setS({ ...s, materialRate: v })} />
          <NumberField label="Plate width" unit="mm" value={s.plateW} set={v => setS({ ...s, plateW: v })} />
          <NumberField label="Plate height" unit="mm" value={s.plateH} set={v => setS({ ...s, plateH: v })} />
          <NumberField label="Pierce count" value={s.pierceCount} set={v => setS({ ...s, pierceCount: v })} />
          <NumberField label="Cut length" unit="mm" value={s.cutLen} set={v => setS({ ...s, cutLen: v })} />
          <NumberField label="Move length" unit="mm" value={s.moveLen} set={v => setS({ ...s, moveLen: v })} />
          <NumberField label="Process time" unit="min" value={s.processTime} set={v => setS({ ...s, processTime: v })} />
          <NumberField label="Cut time" unit="min" value={s.cutTime} set={v => setS({ ...s, cutTime: v })} />
          <NumberField label="Move time" unit="min" value={s.moveTime} set={v => setS({ ...s, moveTime: v })} />
          <NumberField label="Pierce time" unit="min" value={s.pierceTime} set={v => setS({ ...s, pierceTime: v })} />
          <NumberField label="Machine rate" unit="₹/hr" value={s.machineRate} set={v => setS({ ...s, machineRate: v })} />
          <NumberField label="Labour rate" unit="₹/hr" value={s.labourRate} set={v => setS({ ...s, labourRate: v })} />
          <NumberField label="Profit margin" unit="%" value={s.marginPct} set={v => setS({ ...s, marginPct: v })} />
        </div>
      </div>
      <div className="panel-elevated p-5">
        <h3 className="font-display font-semibold mb-3">Cost Breakdown</h3>
        <ResultRow label={`Material weight`} value={`${result.weightKg.toFixed(2)} kg`} />
        <ResultRow label="Raw material cost" value={inr(result.rawMaterial)} />
        <ResultRow label="Machine cost" value={inr(result.machineCost)} />
        <ResultRow label="Labour cost" value={inr(result.labourCost)} />
        <ResultRow label="Total cost" value={inr(result.totalCost)} />
        <ResultRow label={`Profit (${s.marginPct}%)`} value={inr(result.profit)} />
        <ResultRow label="Quotation price" value={inr(result.sellingPrice)} bold />
      </div>
    </div>
  );
}

function BendingCalc() {
  const [s, setS] = useState({ bends: 10, thickness: 3, machineMin: 5, machineRate: 1200, labourRate: 250, materialCost: 0, marginPct: 25 });
  const result = useMemo(() => {
    const machineCost = (s.machineMin / 60) * s.machineRate * s.bends;
    const labourCost = (s.machineMin / 60) * s.labourRate * s.bends;
    const total = s.materialCost + machineCost + labourCost;
    const profit = (total * s.marginPct) / 100;
    return { machineCost, labourCost, total, profit, price: total + profit };
  }, [s]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="panel p-5 lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
        <NumberField label="Number of bends" value={s.bends} set={v => setS({ ...s, bends: v })} />
        <NumberField label="Thickness" unit="mm" value={s.thickness} set={v => setS({ ...s, thickness: v })} />
        <NumberField label="Time per bend" unit="min" value={s.machineMin} set={v => setS({ ...s, machineMin: v })} />
        <NumberField label="Machine rate" unit="₹/hr" value={s.machineRate} set={v => setS({ ...s, machineRate: v })} />
        <NumberField label="Labour rate" unit="₹/hr" value={s.labourRate} set={v => setS({ ...s, labourRate: v })} />
        <NumberField label="Material cost" unit="₹" value={s.materialCost} set={v => setS({ ...s, materialCost: v })} />
        <NumberField label="Profit margin" unit="%" value={s.marginPct} set={v => setS({ ...s, marginPct: v })} />
      </div>
      <div className="panel-elevated p-5">
        <h3 className="font-display font-semibold mb-3">Cost Breakdown</h3>
        <ResultRow label="Machine cost" value={inr(result.machineCost)} />
        <ResultRow label="Labour cost" value={inr(result.labourCost)} />
        <ResultRow label="Total cost" value={inr(result.total)} />
        <ResultRow label={`Profit (${s.marginPct}%)`} value={inr(result.profit)} />
        <ResultRow label="Final price" value={inr(result.price)} bold />
      </div>
    </div>
  );
}

function WeldingCalc() {
  const [s, setS] = useState({ type: "MIG", lengthMm: 1000, hours: 2, materialCost: 500, machineRate: 800, labourRate: 300, consumablePerM: 30, marginPct: 25 });
  const result = useMemo(() => {
    const machineCost = s.hours * s.machineRate;
    const labourCost = s.hours * s.labourRate;
    const consumable = (s.lengthMm / 1000) * s.consumablePerM;
    const total = s.materialCost + machineCost + labourCost + consumable;
    const profit = (total * s.marginPct) / 100;
    return { machineCost, labourCost, consumable, total, profit, price: total + profit };
  }, [s]);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="panel p-5 lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div><Label className="text-xs">Welding type</Label>
          <Select value={s.type} onValueChange={v => setS({ ...s, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MIG">MIG</SelectItem><SelectItem value="TIG">TIG</SelectItem>
              <SelectItem value="CO2">CO₂</SelectItem><SelectItem value="SPARK">Spark</SelectItem>
              <SelectItem value="LASER">Laser Welding</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NumberField label="Welding length" unit="mm" value={s.lengthMm} set={v => setS({ ...s, lengthMm: v })} />
        <NumberField label="Estimated hours" value={s.hours} set={v => setS({ ...s, hours: v })} />
        <NumberField label="Material cost" unit="₹" value={s.materialCost} set={v => setS({ ...s, materialCost: v })} />
        <NumberField label="Machine rate" unit="₹/hr" value={s.machineRate} set={v => setS({ ...s, machineRate: v })} />
        <NumberField label="Labour rate" unit="₹/hr" value={s.labourRate} set={v => setS({ ...s, labourRate: v })} />
        <NumberField label="Consumable" unit="₹/m" value={s.consumablePerM} set={v => setS({ ...s, consumablePerM: v })} />
        <NumberField label="Profit margin" unit="%" value={s.marginPct} set={v => setS({ ...s, marginPct: v })} />
      </div>
      <div className="panel-elevated p-5">
        <h3 className="font-display font-semibold mb-3">Cost Breakdown</h3>
        <ResultRow label="Machine cost" value={inr(result.machineCost)} />
        <ResultRow label="Labour cost" value={inr(result.labourCost)} />
        <ResultRow label="Consumable cost" value={inr(result.consumable)} />
        <ResultRow label="Total cost" value={inr(result.total)} />
        <ResultRow label={`Profit (${s.marginPct}%)`} value={inr(result.profit)} />
        <ResultRow label="Final price" value={inr(result.price)} bold />
      </div>
    </div>
  );
}
