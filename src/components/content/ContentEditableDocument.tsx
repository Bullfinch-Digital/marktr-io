import { Pencil } from "lucide-react";
import { Button } from "../ui/button";
import type { ContentItemType, ContentPayload } from "../../types/contentItemPayload";
import {
  CONTENT_SECTION_LABELS,
  sectionsForContentType,
  type ContentDraft,
  type ContentSectionId,
} from "../../lib/contentItemEditPayload";
import { ContentEditForm } from "./ContentEditForm";
import { ContentItemView } from "./ContentItemView";

type Props = {
  type: ContentItemType;
  draft: ContentDraft;
  stagedSections: ContentSectionId[];
  activeSection: ContentSectionId | null;
  readOnly?: boolean;
  isLocked?: boolean;
  onStartEdit: (section: ContentSectionId) => void;
  onDoneSection: () => void;
  onCancelSection: () => void;
  onDraftChange: (draft: ContentDraft) => void;
};

function SectionShell({
  sectionId,
  isStaged,
  isEditing,
  readOnly,
  canEdit,
  onStartEdit,
  onDoneSection,
  onCancelSection,
  children,
}: {
  sectionId: ContentSectionId;
  isStaged: boolean;
  isEditing: boolean;
  readOnly?: boolean;
  canEdit: boolean;
  onStartEdit: () => void;
  onDoneSection: () => void;
  onCancelSection: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-design border bg-white ${
        isEditing
          ? "border-black/30 shadow-md"
          : isStaged
            ? "border-amber-300/80 bg-amber-50/30"
            : "border-black/10"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 px-4 py-2">
        <div className="flex items-center gap-2">
          {sectionId !== "title" ? (
            <p className="font-['Inter'] text-xs uppercase tracking-wide text-foreground/55">
              {CONTENT_SECTION_LABELS[sectionId]}
            </p>
          ) : null}
          {isStaged && !isEditing ? (
            <span className="font-['Inter'] text-[11px] text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
              Unsaved
            </span>
          ) : null}
        </div>
        {!readOnly ? (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="bg-button-green hover:bg-button-green/90 text-foreground border border-black rounded-design h-8"
                  onClick={onDoneSection}
                >
                  Done
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-black rounded-design h-8"
                  onClick={onCancelSection}
                >
                  Cancel
                </Button>
              </>
            ) : canEdit ? (
              <button
                type="button"
                onClick={onStartEdit}
                className="inline-flex items-center gap-1.5 font-['Inter'] text-xs text-foreground/60 hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent-grey/30"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function ContentEditableDocument({
  type,
  draft,
  stagedSections,
  activeSection,
  readOnly = false,
  isLocked = false,
  onStartEdit,
  onDoneSection,
  onCancelSection,
  onDraftChange,
}: Props) {
  const stagedSet = new Set(stagedSections);
  const canStartEdit = !activeSection && !isLocked;
  const sections = sectionsForContentType(type);

  return (
    <div className="space-y-4">
      {sections.map((sectionId) => (
        <SectionShell
          key={sectionId}
          sectionId={sectionId}
          isStaged={stagedSet.has(sectionId)}
          isEditing={activeSection === sectionId}
          readOnly={readOnly || isLocked}
          canEdit={canStartEdit}
          onStartEdit={() => onStartEdit(sectionId)}
          onDoneSection={onDoneSection}
          onCancelSection={onCancelSection}
        >
          {activeSection === sectionId ? (
            <ContentEditForm
              bare
              type={type}
              draft={draft}
              section={sectionId}
              isLocked={isLocked}
              onChange={onDraftChange}
            />
          ) : sectionId === "title" ? (
            <h1 className="font-['Fraunces'] text-3xl lg:text-4xl text-[#0D1833]">
              {draft.title || "Untitled"}
            </h1>
          ) : (
            <ContentItemView
              type={type}
              content={draft.content as ContentPayload}
              section={sectionId}
              bare
            />
          )}
        </SectionShell>
      ))}
    </div>
  );
}
