import { useRef, useState } from 'react';
import { Upload, X, Link as LinkIcon, FileText, Image, Plus } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { getDataloom } from '@lark-apaas/client-toolkit/dataloom';
import { getDefaultBucketId } from '@lark-apaas/client-toolkit/tools/storage';
import { toast } from 'sonner';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import type { DeliverableAttachment } from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

interface AttachmentUploaderProps {
  attachments: DeliverableAttachment[];
  onChange: (attachments: DeliverableAttachment[]) => void;
  compact?: boolean;
}

const AttachmentUploader = ({
  attachments,
  onChange,
  compact = false,
}: AttachmentUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const dataloom = await getDataloom();
      const bucketId = getDefaultBucketId();
      const newAttachments: DeliverableAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { data, error } = await dataloom.storage
          .from(bucketId)
          .uploadFile(file);
        if (error || !data) {
          throw new Error(
            error?.message ?? (error as unknown as { error_msg?: string })?.error_msg ?? '上传失败',
          );
        }
        const isImage = file.type.startsWith('image/');
        newAttachments.push({
          name: file.name,
          url: data.download_url,
          type: isImage ? 'image' : 'file',
        });
      }

      onChange([...attachments, ...newAttachments]);
      toast.success(`成功上传 ${newAttachments.length} 个文件`);
    } catch (err) {
      logger.error(`附件上传失败: ${String(err)}`);
      toast.error('上传失败，请重试');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      toast.error('请输入链接地址');
      return;
    }
    const newAttachment: DeliverableAttachment = {
      name: linkName.trim() || linkUrl.trim(),
      url: linkUrl.trim(),
      type: 'link',
    };
    onChange([...attachments, newAttachment]);
    setLinkUrl('');
    setLinkName('');
    setShowLinkInput(false);
    toast.success('已添加链接');
  };

  const handleRemove = (index: number) => {
    const next = attachments.filter((_, i: number) => i !== index);
    onChange(next);
  };

  const getIcon = (type: DeliverableAttachment['type']) => {
    switch (type) {
      case 'image':
        return Image;
      case 'link':
        return LinkIcon;
      default:
        return FileText;
    }
  };

  if (compact && attachments.length === 0 && !showLinkInput) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-7 rounded-full text-xs text-muted-foreground hover:text-primary"
        >
          <Upload className="mr-1 h-3 w-3" />
          {uploading ? '上传中...' : '上传产出物'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowLinkInput(true)}
          className="h-7 rounded-full text-xs text-muted-foreground hover:text-primary"
        >
          <Plus className="mr-1 h-3 w-3" />
          添加链接
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map(
            (att: DeliverableAttachment, index: number) => {
              const Icon = getIcon(att.type);
              return (
                <div
                  key={`${att.url}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <UniversalLink
                    to={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground hover:text-primary hover:underline"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{att.name}</span>
                  </UniversalLink>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="移除"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            },
          )}
        </div>
      )}

      {/* Link input */}
      {showLinkInput && (
        <div className="space-y-2 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              添加链接
            </span>
          </div>
          <Input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="text-sm"
          />
          <Input
            type="text"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            placeholder="链接名称（可选）"
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAddLink}
              className="rounded-full text-xs"
            >
              添加
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl('');
                setLinkName('');
              }}
              className="rounded-full text-xs"
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(!compact || attachments.length > 0) && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-full text-xs"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploading ? '上传中...' : '上传文件/图片'}
          </Button>
          {!showLinkInput && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowLinkInput(true)}
              className="rounded-full text-xs"
            >
              <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
              添加链接
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AttachmentUploader;
