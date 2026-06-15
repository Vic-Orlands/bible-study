"use client";

import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  PencilLine,
  Plus,
  Power,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { signInWithGoogle } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type TranslationRecord = NonNullable<
  ReturnType<typeof useQuery<typeof api.customTranslations.listAdmin>>
>[number];

type FormState = {
  abbreviation: string;
  chapterUrlTemplate: string;
  enabled: boolean;
  indexUrl: string;
  languageTag: string;
  licenseNotes: string;
  name: string;
  sourceType: "json";
  supportsFullBible: boolean;
};

const EMPTY_FORM: FormState = {
  abbreviation: "",
  chapterUrlTemplate: "",
  enabled: true,
  indexUrl: "",
  languageTag: "eng",
  licenseNotes: "",
  name: "",
  sourceType: "json",
  supportsFullBible: true,
};

function toFormState(record: TranslationRecord): FormState {
  return {
    abbreviation: record.abbreviation,
    chapterUrlTemplate: record.chapterUrlTemplate,
    enabled: record.enabled,
    indexUrl: record.indexUrl,
    languageTag: record.languageTag,
    licenseNotes: record.licenseNotes ?? "",
    name: record.name,
    sourceType: record.sourceType,
    supportsFullBible: record.supportsFullBible,
  };
}

function normalizeForm(form: FormState) {
  return {
    ...form,
    abbreviation: form.abbreviation.trim(),
    chapterUrlTemplate: form.chapterUrlTemplate.trim(),
    indexUrl: form.indexUrl.trim(),
    languageTag: form.languageTag.trim(),
    licenseNotes: form.licenseNotes.trim(),
    name: form.name.trim(),
  };
}

export function CustomTranslationsManager() {
  const adminState = useQuery(api.auth.getAdminState);
  const translations = useQuery(api.customTranslations.listAdmin);
  const createTranslation = useMutation(api.customTranslations.create);
  const updateTranslation = useMutation(api.customTranslations.update);
  const removeTranslation = useMutation(api.customTranslations.remove);
  const setEnabled = useMutation(api.customTranslations.setEnabled);
  const validateSource = useAction(api.customTranslations.validateSource);

  const [selectedId, setSelectedId] = useState<Id<"customTranslations"> | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    booksCount: number;
    firstBook: string;
    firstChapter: number;
    firstVersePreview: { number: number; text: string };
    supportsFullBible: boolean;
  } | null>(null);

  const selectedTranslation = useMemo(
    () => translations?.find((entry) => entry._id === selectedId) ?? null,
    [selectedId, translations],
  );

  useEffect(() => {
    if (!translations || translations.length === 0) return;
    if (selectedId && translations.some((entry) => entry._id === selectedId)) return;
    const first = [...translations].sort((left, right) =>
      left.name.localeCompare(right.name),
    )[0];
    if (first) {
      setSelectedId(first._id);
      setForm(toFormState(first));
    }
  }, [selectedId, translations]);

  if (adminState === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#7a6758]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading translation admin...
      </div>
    );
  }

  if (!adminState?.isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[520px] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff3e8] text-[#a24723]">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[#25140b]">
            Sign in to manage translations
          </h1>
          <p className="text-sm leading-6 text-[#7a6758]">
            This dashboard is app-owned, but access is gated by Better Auth.
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 bg-[#3a2218] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1f1209]"
          onClick={async () => {
            try {
              await signInWithGoogle("/admin");
            } catch (error) {
              console.error("Failed to sign in for translation admin:", error);
              toast.error("Failed to sign in.");
            }
          }}
          type="button"
        >
          Continue with Google
        </button>
      </div>
    );
  }

  if (!adminState.isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[620px] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff3e8] text-[#a24723]">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[#25140b]">
            Admin access required
          </h1>
          <p className="text-sm leading-6 text-[#7a6758]">
            Your Better Auth session is active, but this email is not in the
            translation admin allowlist.
          </p>
        </div>
      </div>
    );
  }

  const sortedTranslations = [...(translations ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setValidationResult(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForCreate = () => {
    setSelectedId(null);
    setValidationResult(null);
    setForm(EMPTY_FORM);
  };

  const loadTranslation = (translation: TranslationRecord) => {
    setSelectedId(translation._id);
    setValidationResult(null);
    setForm(toFormState(translation));
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const result = await validateSource(normalizeForm(form));
      setValidationResult(result);
      toast.success("Source validated");
    } catch (error) {
      console.error("Failed to validate custom translation source:", error);
      toast.error("Validation failed.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = normalizeForm(form);
    try {
      if (selectedId) {
        await updateTranslation({
          id: selectedId,
          ...payload,
          licenseNotes: payload.licenseNotes || undefined,
        });
        toast.success("Translation updated");
      } else {
        const id = await createTranslation({
          ...payload,
          licenseNotes: payload.licenseNotes || undefined,
        });
        setSelectedId(id);
        toast.success("Translation created");
      }
    } catch (error) {
      console.error("Failed to save custom translation:", error);
      toast.error("Failed to save translation.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col bg-[#fbf7f2] text-[#25140b]">
      <div className="border-b border-[#eadccf] bg-white">
        <div className="mx-auto flex w-full max-w-[1400px] items-end justify-between gap-6 px-6 py-6">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9b8878]">
              Translation Registry
            </p>
            <h1 className="text-2xl font-semibold">Custom translation admin</h1>
            <p className="max-w-[720px] text-sm leading-6 text-[#7a6758]">
              Manage curated translations, validate external sources, and control
              what appears in the study version picker.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold text-[#3a2218]">
              Signed in as {adminState.name}
            </p>
            <p className="text-[11px] text-[#9b8878]">{adminState.email}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1400px] min-w-0 flex-1 grid-cols-[360px_minmax(0,1fr)] gap-6 px-6 py-6">
        <section className="flex min-h-0 flex-col border border-[#eadccf] bg-white">
          <div className="flex items-center justify-between border-b border-[#f1e8df] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Registered sources</h2>
              <p className="text-[11px] text-[#9b8878]">
                {sortedTranslations.length} translation
                {sortedTranslations.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              className="flex h-8 items-center gap-1 border border-[#e5d6c9] px-3 text-[12px] font-semibold text-[#3a2218] hover:border-[#f6823c]"
              onClick={resetForCreate}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          <div className="bible-app-scroll min-h-0 flex-1 overflow-y-auto">
            {sortedTranslations.map((translation) => (
              <button
                className={cn(
                  "flex w-full items-start justify-between border-b border-[#f7efe7] px-4 py-3 text-left hover:bg-[#fbf7f2]",
                  selectedId === translation._id && "bg-[#fff8f0]",
                )}
                key={translation._id}
                onClick={() => loadTranslation(translation)}
                type="button"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold">
                      {translation.abbreviation}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-[0.08em]",
                        translation.enabled ? "text-[#2e6b3d]" : "text-[#9b8878]",
                      )}
                    >
                      {translation.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="truncate text-[12px] text-[#3a2218]">
                    {translation.name}
                  </p>
                  <p className="truncate text-[11px] text-[#9b8878]">
                    {translation.languageTag}
                  </p>
                </div>
                <PencilLine className="mt-0.5 h-4 w-4 shrink-0 text-[#9b8878]" />
              </button>
            ))}
            {sortedTranslations.length === 0 && (
              <div className="px-4 py-6 text-[12px] text-[#7a6758]">
                No custom translations yet.
              </div>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col border border-[#eadccf] bg-white">
          <div className="flex items-center justify-between border-b border-[#f1e8df] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">
                {selectedId ? "Edit translation" : "Create translation"}
              </h2>
              <p className="text-[11px] text-[#9b8878]">
                JSON index plus templated chapter endpoint
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedTranslation && (
                <button
                  className="flex h-9 items-center gap-2 border border-[#e5d6c9] px-3 text-[12px] font-semibold text-[#3a2218] hover:border-[#f6823c]"
                  onClick={async () => {
                    try {
                      await setEnabled({
                        enabled: !selectedTranslation.enabled,
                        id: selectedTranslation._id,
                      });
                      toast.success(
                        selectedTranslation.enabled
                          ? "Translation disabled"
                          : "Translation enabled",
                      );
                    } catch (error) {
                      console.error("Failed to toggle translation enabled state:", error);
                      toast.error("Failed to update status.");
                    }
                  }}
                  type="button"
                >
                  <Power className="h-4 w-4" />
                  {selectedTranslation.enabled ? "Disable" : "Enable"}
                </button>
              )}
              {selectedTranslation && (
                <button
                  className="flex h-9 items-center gap-2 border border-[#f4d4d4] px-3 text-[12px] font-semibold text-[#a24723] hover:bg-[#fff5f5]"
                  onClick={async () => {
                    try {
                      await removeTranslation({ id: selectedTranslation._id });
                      toast.success("Translation deleted");
                      resetForCreate();
                    } catch (error) {
                      console.error("Failed to delete translation:", error);
                      toast.error("Failed to delete translation.");
                    }
                  }}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
            <div className="bible-app-scroll min-h-0 overflow-y-auto px-5 py-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Name"
                  value={form.name}
                  onChange={(value) => updateField("name", value)}
                />
                <Field
                  label="Abbreviation"
                  value={form.abbreviation}
                  onChange={(value) => updateField("abbreviation", value)}
                />
                <Field
                  label="Language tag"
                  value={form.languageTag}
                  onChange={(value) => updateField("languageTag", value)}
                />
                <ToggleField
                  checked={form.enabled}
                  description="Controls whether the translation appears in the study picker."
                  label="Enabled"
                  onChange={(checked) => updateField("enabled", checked)}
                />
                <ToggleField
                  checked={form.supportsFullBible}
                  description="Marks this source as complete enough to drive book/chapter navigation."
                  label="Supports full Bible"
                  onChange={(checked) => updateField("supportsFullBible", checked)}
                />
              </div>

              <div className="mt-5 grid gap-5">
                <Field
                  label="Index URL"
                  value={form.indexUrl}
                  onChange={(value) => updateField("indexUrl", value)}
                />
                <Field
                  label="Chapter URL template"
                  value={form.chapterUrlTemplate}
                  onChange={(value) => updateField("chapterUrlTemplate", value)}
                />
                <LongField
                  label="License notes"
                  value={form.licenseNotes}
                  onChange={(value) => updateField("licenseNotes", value)}
                />
              </div>
            </div>

            <aside className="border-l border-[#f1e8df] bg-[#fcfaf7] px-5 py-5">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9b8878]">
                    Source Validation
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-[#25140b]">
                    Validate provider shape
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-[#7a6758]">
                    Checks the index endpoint, resolves the first chapter, and
                    confirms the normalized verse payload.
                  </p>
                </div>

                <button
                  className="flex h-10 w-full items-center justify-center gap-2 bg-[#3a2218] text-[12px] font-semibold text-white hover:bg-[#1f1209] disabled:opacity-60"
                  disabled={isValidating}
                  onClick={handleValidate}
                  type="button"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Validate source
                </button>

                {validationResult ? (
                  <div className="border border-[#dbeedc] bg-white p-4">
                    <div className="flex items-center gap-2 text-[#2e6b3d]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-[12px] font-semibold">
                        Validation passed
                      </span>
                    </div>
                    <dl className="mt-3 space-y-2 text-[12px] text-[#3a2218]">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#7a6758]">Books</dt>
                        <dd>{validationResult.booksCount}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#7a6758]">Preview chapter</dt>
                        <dd>
                          {validationResult.firstBook} {validationResult.firstChapter}
                        </dd>
                      </div>
                      <div className="space-y-1">
                        <dt className="text-[#7a6758]">First verse</dt>
                        <dd className="font-serif text-[13px] leading-6">
                          {validationResult.firstVersePreview.number}.{" "}
                          {validationResult.firstVersePreview.text}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <div className="border border-dashed border-[#e5d6c9] bg-white p-4 text-[12px] leading-5 text-[#7a6758]">
                    Use placeholders in the chapter URL template:
                    <div className="mt-2 font-mono text-[11px] text-[#3a2218]">
                      {"{bookId}"} {"{chapter}"} {"{bookName}"}
                    </div>
                  </div>
                )}

                <button
                  className="flex h-10 w-full items-center justify-center gap-2 border border-[#e5d6c9] bg-white text-[12px] font-semibold text-[#3a2218] hover:border-[#f6823c] disabled:opacity-60"
                  disabled={isSaving}
                  onClick={handleSave}
                  type="button"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {selectedId ? "Save changes" : "Create translation"}
                </button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[12px] font-semibold text-[#3a2218]">{label}</span>
      <input
        className="h-11 w-full border border-[#e5d6c9] bg-white px-3 text-[13px] text-[#25140b] outline-none transition-colors focus:border-[#f6823c]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function LongField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[12px] font-semibold text-[#3a2218]">{label}</span>
      <textarea
        className="min-h-[120px] w-full border border-[#e5d6c9] bg-white px-3 py-3 text-[13px] text-[#25140b] outline-none transition-colors focus:border-[#f6823c]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function ToggleField({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 border border-[#f1e8df] bg-[#fcfaf7] px-4 py-3">
      <input
        checked={checked}
        className="mt-1 h-4 w-4 accent-[#3a2218]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="space-y-1">
        <span className="block text-[12px] font-semibold text-[#3a2218]">
          {label}
        </span>
        <span className="block text-[11px] leading-5 text-[#7a6758]">
          {description}
        </span>
      </span>
    </label>
  );
}
