"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

type SiteOption = {
  id: string;
  site_name: string;
  domain: string;
};

type PresetSummary = {
  id: string;
  label: string;
};

export function KeywordPackGeneratorForm({
  sites,
}: {
  sites: SiteOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [packSize, setPackSize] = useState("50");
  const [generationMode, setGenerationMode] = useState("balanced");
  const [preview, setPreview] = useState(false);
  const [largePackConfirmed, setLargePackConfirmed] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetOptions, setPresetOptions] = useState<PresetSummary[]>(
    fallbackPresetOptions
  );
  const [fields, setFields] = useState({
    name: "Travel content opportunity map",
    niche: "Travel planning",
    targetLanguage: "English",
    targetCountries: "United States, Canada, United Kingdom, Australia",
    audience: "Solo travelers, private group travelers, family vacation planners",
    businessGoal: "Grow organic traffic with helpful planning guides and commercial comparison content.",
    monetizationModel: "Affiliate travel bookings, display ads, sponsored recommendations",
    excludedTopics: "adult travel, gambling, illegal activities, medical claims",
    preferredCategories: "Destinations, Travel Planning, Budget Travel, Family Travel, Travel Gear, Travel Apps",
    brandNotes: "Friendly, practical, trustworthy, and easy to scan. Avoid hype and unsupported claims.",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  async function loadPresetOptions() {
    try {
      const response = await fetch("/api/keyword-packs/presets");
      const result = await response.json();

      if (response.ok && Array.isArray(result.presets)) {
        setPresetOptions(result.presets);
      }
    } catch {
      setPresetOptions(fallbackPresetOptions);
    }
  }

  async function applyCategoryPreset(presetId: string) {
    if (!presetId) {
      return;
    }

    setPresetLoading(true);

    try {
      const response = await fetch(
        `/api/keyword-packs/presets?id=${encodeURIComponent(presetId)}`
      );
      const result = await response.json();

      if (!response.ok || !result.preset) {
        toast.error(
          "Preset not loaded",
          result.error || "Unable to load this category preset."
        );
        return;
      }

      const preset = result.preset;

      setFields({
        name: preset.name,
        niche: preset.niche,
        targetLanguage: preset.targetLanguage,
        targetCountries: preset.targetCountries,
        audience: preset.audience,
        businessGoal: preset.businessGoal,
        monetizationModel: preset.monetizationModel,
        excludedTopics: preset.excludedTopics,
        preferredCategories: preset.preferredCategories,
        brandNotes: preset.brandNotes,
      });
      setGenerationMode(
        typeof preset.recommendedGenerationMode === "string"
          ? preset.recommendedGenerationMode
          : "balanced"
      );

      toast.success(
        "Category preset applied",
        "The keyword-pack fields were autofilled for this content category."
      );
    } catch (error) {
      toast.error(
        "Preset not loaded",
        error instanceof Error ? error.message : "Unable to load preset."
      );
    } finally {
      setPresetLoading(false);
    }
  }

  async function submit(formData: FormData, startAfterCreate: boolean) {
    const requestedKeywordCount = Number(
      formData.get("requestedKeywordCount") || 50
    );

    if (startAfterCreate && requestedKeywordCount >= 500 && !largePackConfirmed) {
      toast.warning(
        "Confirm large pack",
        "Large keyword packs use more AI calls. Check the confirmation box before starting."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/keyword-packs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId: formData.get("siteId"),
          name: fields.name,
          niche: fields.niche,
          targetLanguage: fields.targetLanguage,
          targetCountries: fields.targetCountries,
          audience: fields.audience,
          businessGoal: fields.businessGoal,
          monetizationModel: fields.monetizationModel,
          excludedTopics: fields.excludedTopics,
          preferredCategories: fields.preferredCategories,
          brandNotes: fields.brandNotes,
          requestedKeywordCount,
          generationMode,
          createdBy: "manual",
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(
          "Keyword pack not created",
          result.error || "Unable to create keyword pack."
        );
        return;
      }

      if (startAfterCreate) {
        const startResponse = await fetch(
          `/api/keyword-packs/${result.keywordPackId}/start`,
          {
            method: "POST",
          }
        );
        const startResult = await startResponse.json();

        if (!startResponse.ok) {
          toast.warning(
            "Draft saved, start failed",
            startResult.error ||
              "The pack was saved but could not be queued."
          );
          router.push(`/keywords/packs/${result.keywordPackId}`);
          return;
        }
      }

      toast.success(
        startAfterCreate ? "Keyword pack queued" : "Keyword pack saved",
        startAfterCreate
          ? "The keyword-pack worker can now generate it."
          : "Open the pack when you are ready to start generation."
      );
      router.push(`/keywords/packs/${result.keywordPackId}`);
    } catch (error) {
      toast.error(
        "Keyword pack failed",
        error instanceof Error ? error.message : "Unexpected error."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      action={(formData) => submit(formData, false)}
      className="space-y-6"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Content category autofill">
          <select
            value=""
            onFocus={loadPresetOptions}
            onChange={(event) => applyCategoryPreset(event.target.value)}
            className={inputClass}
            disabled={presetLoading}
          >
            <option value="">
              {presetLoading
                ? "Loading preset..."
                : "Choose a category to autofill fields..."}
            </option>
            {presetOptions.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Site">
          <select name="siteId" className={inputClass} required>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.site_name} ({site.domain})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pack name">
          <input
            name="name"
            value={fields.name}
            onChange={(event) => updateField("name", event.target.value)}
            className={inputClass}
            list="keyword-pack-name-presets"
            placeholder="Productivity app opportunity map"
            required
          />
          <PresetList id="keyword-pack-name-presets" values={packNamePresets} />
        </Field>

        <Field label="Niche">
          <input
            name="niche"
            value={fields.niche}
            onChange={(event) => updateField("niche", event.target.value)}
            className={inputClass}
            list="keyword-pack-niche-presets"
            placeholder="Small business productivity software"
            required
          />
          <PresetList id="keyword-pack-niche-presets" values={nichePresets} />
        </Field>

        <Field label="Target language">
          <select
            name="targetLanguage"
            value={fields.targetLanguage}
            onChange={(event) => updateField("targetLanguage", event.target.value)}
            className={inputClass}
          >
            {languagePresets.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Target countries">
          <input
            name="targetCountries"
            value={fields.targetCountries}
            onChange={(event) => updateField("targetCountries", event.target.value)}
            className={inputClass}
            list="keyword-pack-country-presets"
            placeholder="United States, Canada, United Kingdom"
          />
          <PresetList id="keyword-pack-country-presets" values={countryPresets} />
        </Field>

        <Field label="Generation mode">
          <select
            name="generationMode"
            value={generationMode}
            onChange={(event) => setGenerationMode(event.target.value)}
            className={inputClass}
          >
            <option value="balanced">Balanced</option>
            <option value="low_competition">Low competition</option>
            <option value="high_traffic">High traffic</option>
            <option value="commercial">Commercial</option>
            <option value="informational">Informational</option>
          </select>
        </Field>

        <Field label="Pack size">
          <select
            name="requestedKeywordCount"
            value={packSize}
            onChange={(event) => {
              setPackSize(event.target.value);
              if (Number(event.target.value) < 500) {
                setLargePackConfirmed(false);
              }
            }}
            className={inputClass}
          >
            <option value="50">50 keywords</option>
            <option value="100">100 keywords</option>
            <option value="250">250 keywords</option>
            <option value="500">500 keywords</option>
            <option value="1000">1,000 keywords</option>
          </select>
        </Field>

        <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-800">Estimated AI usage</div>
          <div className="mt-1">
            {Number(packSize) >= 500
              ? "High"
              : Number(packSize) >= 250
                ? "Medium"
                : "Low"}
          </div>
        </div>
      </div>

      <PresetPanel
        title="Popular category packs"
        description="Use these as a starting point, then edit the category list if needed."
        options={categoryPackPresets}
        onApply={(value) => updateField("preferredCategories", value)}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <TextArea
          label="Audience"
          name="audience"
          value={fields.audience}
          presets={audiencePresets}
          onChange={(value) => updateField("audience", value)}
        />
        <TextArea
          label="Business goal"
          name="businessGoal"
          value={fields.businessGoal}
          presets={businessGoalPresets}
          onChange={(value) => updateField("businessGoal", value)}
        />
        <TextArea
          label="Monetization model"
          name="monetizationModel"
          value={fields.monetizationModel}
          presets={monetizationPresets}
          onChange={(value) => updateField("monetizationModel", value)}
        />
        <TextArea
          label="Excluded topics"
          name="excludedTopics"
          value={fields.excludedTopics}
          presets={excludedTopicPresets}
          onChange={(value) => updateField("excludedTopics", value)}
        />
        <TextArea
          label="Preferred categories"
          name="preferredCategories"
          value={fields.preferredCategories}
          presets={categoryPackPresets.map((preset) => preset.value)}
          onChange={(value) => updateField("preferredCategories", value)}
        />
        <TextArea
          label="Brand notes"
          name="brandNotes"
          value={fields.brandNotes}
          presets={brandNotePresets}
          onChange={(value) => updateField("brandNotes", value)}
        />
      </div>

      {Number(packSize) >= 500 && (
        <label className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
          <input
            type="checkbox"
            checked={largePackConfirmed}
            onChange={(event) => setLargePackConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-amber-300"
          />
          <span>
            I understand this large keyword pack will use more AI calls and may
            take longer to complete.
          </span>
        </label>
      )}

      {preview && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          Preview target: {packSize} AI-estimated keywords organized into
          categories, clusters, pillar articles, and supporting articles. Final
          structure appears after the background worker runs.
        </div>
      )}

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
        Metrics are AI estimates for prioritization and should be validated
        with an SEO data provider before major publishing decisions.
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPreview((current) => !current)}
        >
          Generate Preview
        </Button>

        <Button type="submit" variant="secondary" disabled={loading}>
          {loading ? "Saving..." : "Save Draft"}
        </Button>

        <Button
          type="button"
          disabled={loading}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) {
              submit(new FormData(form), true);
            }
          }}
        >
          {loading ? "Starting..." : "Start Generation"}
        </Button>
      </div>
    </form>
  );

  function updateField(field: keyof typeof fields, value: string) {
    setFields((current) => ({
      ...current,
      [field]: value,
    }));
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  presets,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  presets: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value=""
        onChange={(event) => {
          if (event.target.value) {
            onChange(event.target.value);
          }
        }}
        className={`${inputClass} mb-2 bg-slate-50`}
      >
        <option value="">Choose a preset...</option>
        {presets.map((preset) => (
          <option key={preset} value={preset}>
            {preset}
          </option>
        ))}
      </select>
      <textarea
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} min-h-28`}
      />
    </Field>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

function PresetList({ id, values }: { id: string; values: string[] }) {
  return (
    <datalist id={id}>
      {values.map((value) => (
        <option key={value} value={value} />
      ))}
    </datalist>
  );
}

function PresetPanel({
  title,
  description,
  options,
  onApply,
}: {
  title: string;
  description: string;
  options: Array<{ label: string; value: string }>;
  onApply: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onApply(option.value)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const packNamePresets = [
  "Travel content opportunity map",
  "Productivity app opportunity map",
  "Home improvement SEO content plan",
  "Personal finance keyword architecture",
  "AI tools comparison keyword pack",
];

const nichePresets = [
  "Travel planning",
  "Budget travel",
  "Task management apps",
  "Home improvement",
  "Personal finance",
  "AI productivity tools",
  "Small business software",
  "Family travel",
  "Cybersecurity basics",
  "Remote work tools",
];

const languagePresets = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
];

const countryPresets = [
  "United States",
  "United States, Canada, United Kingdom, Australia",
  "United States, Canada",
  "United Kingdom, Ireland",
  "European Union",
  "Global English-speaking audience",
];

const audiencePresets = [
  "Solo travelers, private group travelers, family vacation planners",
  "Small business owners, team leads, operations managers",
  "Beginners who need practical step-by-step guidance",
  "Budget-conscious buyers comparing free and paid options",
  "Homeowners researching safe DIY and professional service options",
];

const businessGoalPresets = [
  "Grow organic traffic with helpful planning guides and commercial comparison content.",
  "Build topical authority with pillar pages and supporting how-to articles.",
  "Capture affiliate-intent searches while keeping informational coverage strong.",
  "Create a balanced editorial roadmap for awareness, consideration, and conversion.",
  "Find low-competition content opportunities for steady long-tail growth.",
];

const monetizationPresets = [
  "Affiliate travel bookings, display ads, sponsored recommendations",
  "Software affiliate programs, lead generation, display ads",
  "Product affiliate links, buyer guides, display ads",
  "Service leads, local recommendations, sponsored placements",
  "Newsletter growth, digital products, affiliate offers",
];

const excludedTopicPresets = [
  "adult travel, gambling, illegal activities, medical claims",
  "adult content, gambling, crypto speculation, illegal activity",
  "medical advice, legal advice, financial guarantees",
  "unsafe DIY electrical work, structural engineering claims, hazardous materials",
  "politics, religion, adult content, unsupported income claims",
];

const brandNotePresets = [
  "Friendly, practical, trustworthy, and easy to scan. Avoid hype and unsupported claims.",
  "Neutral expert tone with clear recommendations and no exaggerated promises.",
  "Beginner-friendly explanations with concise steps and concrete examples.",
  "Commercially useful but editorially honest. Include pros, cons, and fit guidance.",
  "Calm, helpful, and evidence-aware. Avoid fear-based framing.",
];

const categoryPackPresets = [
  {
    label: "Travel",
    value:
      "Destinations, Travel Planning, Budget Travel, Family Travel, Solo Travel, Travel Gear, Travel Apps, Hotels and Stays",
  },
  {
    label: "Productivity",
    value:
      "Task Management, Project Management, Time Management, Team Collaboration, Automation, Productivity Apps, Remote Work, Templates",
  },
  {
    label: "Home",
    value:
      "DIY Projects, Home Maintenance, Tools and Materials, Renovation Planning, Safety, Smart Home, Outdoor Spaces, Hiring Contractors",
  },
  {
    label: "Finance",
    value:
      "Budgeting, Saving Money, Credit, Banking, Investing Basics, Taxes, Insurance, Financial Apps, Family Finance",
  },
  {
    label: "AI Tools",
    value:
      "AI Writing Tools, AI Productivity, AI Image Tools, AI Automation, Prompting, Business Use Cases, Tool Comparisons, AI Safety",
  },
  {
    label: "Software",
    value:
      "Best Software, Free Tools, Alternatives, Comparisons, Reviews, Integrations, Workflows, Buying Guides",
  },
];

const fallbackPresetOptions = [
  { id: "travel", label: "Travel" },
  { id: "ai-tools", label: "AI Tools" },
  { id: "productivity", label: "Productivity" },
  { id: "personal-finance", label: "Personal Finance" },
  { id: "home-improvement", label: "Home Improvement" },
  { id: "health-wellness", label: "Health & Wellness" },
  { id: "food-cooking", label: "Food & Cooking" },
  { id: "small-business", label: "Small Business" },
];
