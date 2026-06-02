"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import clsx from "clsx";
import { useEffect } from "react";

export function RichTextEditor({
  value,
  onBlurSave,
}: {
  value: string | null;
  onBlurSave: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        autolink: true,
        openOnClick: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
    ],
    content: value ?? "",
    editorProps: {
      attributes: {
        class:
          "prose-card text-sm min-h-[120px] outline-none p-2 rounded bg-panel2 border border-border focus:border-accent",
      },
    },
    onBlur: ({ editor }) => onBlurSave(editor.getHTML()),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && (value ?? "") !== editor.getHTML()) {
      editor.commands.setContent(value ?? "", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div>
      <div className="flex gap-1 mb-1">
        <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          B
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic">I</span>
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "h-7 w-7 rounded text-sm grid place-items-center border",
        active ? "bg-panel2 border-accent text-text" : "border-border text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
