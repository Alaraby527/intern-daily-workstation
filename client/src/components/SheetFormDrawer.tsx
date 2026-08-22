import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@client/src/components/ui/sheet';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { Calendar as CalendarIcon, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { bitable } from '@client/src/api';
import { extractErrorMessage } from '@client/src/api/http-utils';
import type {
  SheetTableDef,
  FormFieldDef,
  SheetRecord,
  SheetTableKey,
  LineCode,
} from '@shared/api.interface';

interface SheetFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableDef: SheetTableDef | null;
  tableName: string;
  taskId: string;
  internName: string;
  lineCode: LineCode;
  recordDate: string;
  records: SheetRecord[];
  onRecordCreated: () => void;
}

const SheetFormDrawer = ({
  open,
  onOpenChange,
  tableDef,
  tableName,
  taskId,
  internName,
  lineCode,
  recordDate,
  records,
  onRecordCreated,
}: SheetFormDrawerProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ enabled: boolean; configured: boolean }>({
    enabled: false,
    configured: false,
  });
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');

  const defaultValues = useMemo(() => {
    if (!tableDef) return {};
    const defaults: Record<string, any> = {};
    for (const field of tableDef.fields) {
      if (field.autoFill === 'internName') {
        defaults[field.key] = internName;
      } else {
        defaults[field.key] = '';
      }
    }
    return defaults;
  }, [tableDef, internName]);

  useEffect(() => {
    if (open) {
      setFormData(defaultValues);
      setActiveTab('form');
      bitable.getSyncStatus().then((status) => setSyncStatus(status));
    }
  }, [open, defaultValues]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!tableDef) return;

    const requiredFields = tableDef.fields.filter((f) => f.required);
    for (const field of requiredFields) {
      if (!formData[field.key]) {
        toast.error(`请填写${field.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await bitable.createSheetRecord({
        tableKey: tableDef.tableKey as SheetTableKey,
        taskId,
        internName,
        lineCode,
        recordDate,
        fieldsData: formData,
      });

      if (result.synced) {
        toast.success('已保存并同步到飞书电子表格');
      } else if (result.syncError) {
        toast.warning(`已保存到本地，飞书同步失败：${result.syncError.slice(0, 50)}`);
      } else {
        toast.success('已保存到本地');
      }

      setFormData(defaultValues);
      onRecordCreated();
    } catch (error) {
      logger.error('提交Sheets记录失败', error);
      const msg = extractErrorMessage(error, '未知错误');
      toast.error(`提交失败：${msg.slice(0, 120)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: FormFieldDef) => {
    const value = formData[field.key] ?? '';

    if (field.type === 'textarea') {
      return (
        <Textarea
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          placeholder={`请输入${field.label}`}
          rows={4}
        />
      );
    }

    return (
      <Input
        type="text"
        value={value}
        onChange={(e) => handleFieldChange(field.key, e.target.value)}
        placeholder={`请输入${field.label}`}
      />
    );
  };

  const getRecordSummary = (record: SheetRecord): string => {
    const fields = tableDef?.fields ?? [];
    const firstTextField = fields.find((f) => f.type === 'text' && !f.autoFill);
    if (firstTextField && record.fieldsData[firstTextField.key]) {
      return record.fieldsData[firstTextField.key];
    }
    return record.id.slice(0, 8);
  };

  const isStatusField = (key: string) => key === 'status';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{tableName}</SheetTitle>
          <SheetDescription>
            填写后数据将保存到本地
            {syncStatus.enabled ? '并同步到飞书电子表格' : syncStatus.configured ? '，飞书同步未启用' : '，飞书集成未配置'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex gap-1 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === 'form'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            新增记录
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            已填写 ({records.length})
          </button>
        </div>

        {activeTab === 'form' && tableDef && (
          <div className="mt-4 space-y-4">
            {tableDef.fields
              .filter((f) => !isStatusField(f.key))
              .map((field: FormFieldDef) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                    {field.autoFill && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        （已自动填充）
                      </span>
                    )}
                  </label>
                  {renderField(field)}
                </div>
              ))}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="mt-4 space-y-2">
            {records.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                暂无已填写的记录
              </div>
            ) : (
              records.map((record: SheetRecord) => (
                <div
                  key={record.id}
                  className="flex items-start justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {getRecordSummary(record)}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{record.recordDate}</span>
                      <span>·</span>
                      {record.feishuSyncStatus === 'success' && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="size-3" />
                          已同步飞书
                        </span>
                      )}
                      {record.feishuSyncStatus === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <AlertCircle className="size-3" />
                          同步失败
                        </span>
                      )}
                      {record.feishuSyncStatus === 'pending' && (
                        <span className="text-warning">同步中...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <SheetFooter className="mt-6">
          <SheetClose asChild>
            <Button variant="outline">关闭</Button>
          </SheetClose>
          {activeTab === 'form' && (
            <Button onClick={handleSubmit} disabled={submitting}>
              <Plus className="size-4" />
              {submitting ? '提交中...' : '保存记录'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default SheetFormDrawer;
