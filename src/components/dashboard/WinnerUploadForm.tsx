"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, UploadCloud, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WinnerUploadForm({ winnerId }: { winnerId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 2. Upload file to Supabase Storage (bucket: 'proofs')
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${winnerId}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("proofs")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data: publicUrlData } = supabase.storage.from("proofs").getPublicUrl(fileName);

      // 4. Update winner record
      const { error: updateError } = await supabase
        .from("winners")
        .update({ proof_url: publicUrlData.publicUrl })
        .eq("id", winnerId);

      if (updateError) throw updateError;

      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message ?? "Failed to upload proof. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-brand-400 text-sm font-medium">
        <CheckCircle className="w-4 h-4" /> Proof uploaded successfully. Awaiting review.
      </div>
    );
  }

  return (
    <form onSubmit={handleUpload} className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <label className="flex-1 cursor-pointer">
          <div className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-[#2a2d3d] hover:border-brand-500 rounded-xl bg-black/20 hover:bg-black/40 transition-colors">
            <UploadCloud className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300 truncate">
              {file ? file.name : "Select screenshot (.jpg, .png)"}
            </span>
          </div>
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        
        <button
          type="submit"
          disabled={!file || uploading}
          className="btn-primary py-3 whitespace-nowrap !rounded-xl disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
        </button>
      </div>
    </form>
  );
}
