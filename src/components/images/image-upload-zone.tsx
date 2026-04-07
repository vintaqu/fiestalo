"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, ImagePlus, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_SIZE_MB   = 10;
const MAX_SIZE_B    = MAX_SIZE_MB * 1024 * 1024;

interface UploadedImage {
  url:          string;
  cloudinaryId: string;
  width:        number;
  height:       number;
  format:       string;
}

interface ImageUploadZoneProps {
  venueId:   string;
  onUploaded: (image: UploadedImage) => void;
  disabled?:  boolean;
  maxImages?: number;
  current?:   number;
}

interface UploadingFile {
  id:       string;
  file:     File;
  preview:  string;
  progress: number;
  error?:   string;
  done:     boolean;
}

export function ImageUploadZone({
  venueId,
  onUploaded,
  disabled = false,
  maxImages = 20,
  current = 0,
}: ImageUploadZoneProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = maxImages - current;

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Formato no permitido: ${file.type || "desconocido"}. Usa JPG, PNG, WebP o HEIC.`;
    }
    if (file.size > MAX_SIZE_B) {
      return `El archivo supera ${MAX_SIZE_MB}MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }
    return null;
  }

  async function uploadFile(file: File, uploadingId: string) {
    // 1. Get signed upload params from server
    let signData: any;
    try {
      const signRes = await fetch("/api/cloudinary/sign", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ venueId }),
      });
      if (!signRes.ok) {
        const err = await signRes.json();
        throw new Error(err.error ?? "Error al obtener firma de subida");
      }
      signData = await signRes.json();
    } catch (e: any) {
      setUploading((prev) =>
        prev.map((u) =>
          u.id === uploadingId ? { ...u, error: e.message, progress: 0 } : u
        )
      );
      return;
    }

    // 2. Upload to Cloudinary via XMLHttpRequest for progress tracking
    const formData = new FormData();
    formData.append("file",            file);
    formData.append("api_key",         signData.apiKey);
    formData.append("timestamp",       String(signData.timestamp));
    formData.append("signature",       signData.signature);
    formData.append("folder",          signData.folder);
    formData.append("allowed_formats", signData.allowedFormats.join(","));
    formData.append("tags",            signData.tags);
    // On-the-fly transformation: auto quality + format
    formData.append("transformation",  "q_auto,f_auto");

    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploading((prev) =>
            prev.map((u) => (u.id === uploadingId ? { ...u, progress: pct } : u))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);

          // 3. Register in our DB
          fetch(`/api/owner/spaces/${venueId}/images`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              url:          res.secure_url,
              cloudinaryId: res.public_id,
              width:        res.width,
              height:       res.height,
              alt:          file.name.replace(/\.[^.]+$/, ""),
            }),
          })
            .then((r) => r.json())
            .then((dbRes) => {
              setUploading((prev) =>
                prev.map((u) =>
                  u.id === uploadingId ? { ...u, done: true, progress: 100 } : u
                )
              );
              onUploaded({
                url:          res.secure_url,
                cloudinaryId: res.public_id,
                width:        res.width,
                height:       res.height,
                format:       res.format,
              });
              // Remove from uploading list after a short delay
              setTimeout(() => {
                setUploading((prev) => prev.filter((u) => u.id !== uploadingId));
              }, 1200);
            })
            .catch(() => {
              setUploading((prev) =>
                prev.map((u) =>
                  u.id === uploadingId
                    ? { ...u, error: "Error al registrar imagen", progress: 0 }
                    : u
                )
              );
            });
        } else {
          let errMsg = "Error al subir imagen";
          try {
            const res = JSON.parse(xhr.responseText);
            errMsg = res.error?.message ?? errMsg;
          } catch {}
          setUploading((prev) =>
            prev.map((u) =>
              u.id === uploadingId ? { ...u, error: errMsg, progress: 0 } : u
            )
          );
        }
        resolve();
      };

      xhr.onerror = () => {
        setUploading((prev) =>
          prev.map((u) =>
            u.id === uploadingId
              ? { ...u, error: "Error de red al subir", progress: 0 }
              : u
          )
        );
        resolve();
      };

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`);
      xhr.send(formData);
    });
  }

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, remaining);
      if (fileArray.length === 0) return;

      const newUploads: UploadingFile[] = fileArray.map((file) => ({
        id:       Math.random().toString(36).slice(2),
        file,
        preview:  URL.createObjectURL(file),
        progress: 0,
        done:     false,
        error:    validateFile(file) ?? undefined,
      }));

      setUploading((prev) => [...prev, ...newUploads]);

      // Upload valid files concurrently (max 3 at a time)
      const valid = newUploads.filter((u) => !u.error);
      const chunks = [];
      for (let i = 0; i < valid.length; i += 3) {
        chunks.push(valid.slice(i, i + 3));
      }
      for (const chunk of chunks) {
        await Promise.all(chunk.map((u) => uploadFile(u.file, u.id)));
      }
    },
    [venueId, remaining, onUploaded]
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled || remaining <= 0) return;

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ALLOWED_TYPES.includes(f.type)
    );
    processFiles(files);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  }

  const isDisabled = disabled || remaining <= 0;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!isDisabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !isDisabled && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
          dragging && !isDisabled
            ? "border-primary bg-primary/5 scale-[1.01]"
            : isDisabled
            ? "border-border bg-muted/30 cursor-not-allowed opacity-60"
            : "border-border hover:border-primary/50 hover:bg-secondary/40"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={onInputChange}
          disabled={isDisabled}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
            dragging ? "bg-primary/10" : "bg-secondary"
          )}>
            {dragging ? (
              <Upload className="w-6 h-6 text-primary" />
            ) : (
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
            )}
          </div>

          <div>
            <p className="font-medium text-sm">
              {isDisabled && remaining <= 0
                ? "Límite de imágenes alcanzado"
                : dragging
                ? "Suelta las imágenes aquí"
                : "Arrastra fotos o haz clic para seleccionar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WebP, HEIC · Máx. {MAX_SIZE_MB}MB por imagen · Quedan {remaining} de {maxImages}
            </p>
          </div>
        </div>
      </div>

      {/* Upload progress items */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((u) => (
            <div
              key={u.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border text-sm",
                u.error
                  ? "border-destructive/30 bg-destructive/5"
                  : u.done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-border bg-card"
              )}
            >
              {/* Preview thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                <img src={u.preview} alt="" className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-xs">{u.file.name}</p>

                {u.error ? (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {u.error}
                  </p>
                ) : u.done ? (
                  <p className="text-xs text-emerald-600 mt-0.5">✓ Subida completada</p>
                ) : (
                  <div className="mt-1.5">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${u.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{u.progress}%</p>
                  </div>
                )}
              </div>

              {!u.done && !u.error && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
