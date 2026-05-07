import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  findFoodByName,
  getEquivalences,
  macrosForQuantity,
  searchFoodCatalog,
} from "@/lib/food-catalog";
import {
  isMfpConfigured,
  macrosForExternalQuantity,
  searchMfpFoods,
} from "@/lib/mfp-provider";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "search";
  const provider = searchParams.get("provider") ?? "auto"; // auto | mfp | local
  const useMfp = provider !== "local";
  const forceMfp = provider === "mfp";

  if (action === "search") {
    const q = searchParams.get("q") ?? "";
    const externalResults = useMfp && isMfpConfigured() ? await searchMfpFoods(q) : [];
    if (externalResults.length > 0) {
      return NextResponse.json({ source: "MyFitnessPal", results: externalResults });
    }

    if (forceMfp && !isMfpConfigured()) {
      return NextResponse.json({ source: "MyFitnessPal (no configurado)", results: [] });
    }

    const results = searchFoodCatalog(q, 10);
    return NextResponse.json({ source: "Apex-MFP", results });
  }

  if (action === "resolve") {
    const food = searchParams.get("food") ?? "";
    const quantity = Number(searchParams.get("quantity") ?? 100);

    if (useMfp && isMfpConfigured()) {
      const externalResults = await searchMfpFoods(food);
      if (externalResults.length > 0) {
        const item = externalResults[0];
        return NextResponse.json({
          source: "MyFitnessPal",
          item,
          macros: macrosForExternalQuantity(item, quantity > 0 ? quantity : 100),
        });
      }
    }

    if (forceMfp && !isMfpConfigured()) {
      return NextResponse.json({ source: "MyFitnessPal (no configurado)", item: null });
    }

    const item = findFoodByName(food);
    if (!item) {
      return NextResponse.json({ source: "Apex-MFP", item: null });
    }

    return NextResponse.json({
      source: "Apex-MFP",
      item,
      macros: macrosForQuantity(item, quantity > 0 ? quantity : 100),
    });
  }

  if (action === "equivalences") {
    const food = searchParams.get("food") ?? "";
    const quantity = Number(searchParams.get("quantity") ?? 100);

    if (useMfp && isMfpConfigured()) {
      const externalResults = await searchMfpFoods(food);
      if (externalResults.length > 1) {
        const base = externalResults[0];
        const baseKcal = Math.round((base.kcalPer100 * (quantity > 0 ? quantity : 100)) / 100);
        const items = externalResults
          .slice(1, 5)
          .map((x) => {
            const eqQty = Math.round((baseKcal / x.kcalPer100) * 100);
            return {
              name: x.name,
              quantity: eqQty,
              unit: x.unit,
              kcal: Math.round((x.kcalPer100 * eqQty) / 100),
            };
          });

        return NextResponse.json({
          source: "MyFitnessPal",
          base: {
            name: base.name,
            quantity: quantity > 0 ? quantity : 100,
            unit: base.unit,
            kcal: baseKcal,
          },
          items,
        });
      }
    }

    if (forceMfp && !isMfpConfigured()) {
      return NextResponse.json({ source: "MyFitnessPal (no configurado)", base: null, items: [] });
    }

    const result = getEquivalences(food, quantity > 0 ? quantity : 100, 4);
    return NextResponse.json({ source: "Apex-MFP", ...result });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
