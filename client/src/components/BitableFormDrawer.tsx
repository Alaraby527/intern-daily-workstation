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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@client/src/components/ui/alert-dialog';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { Calendar } from '@client/src/components/ui/calendar';
import { Calendar as CalendarIcon, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { bitable } from '@client/src/api';
import { extractErrorMessage } from '@client/src/api/http-utils';
import { parseDate } from '@client/src/utils/date';
import { getInternByName } from '@client/src/data/interns';
import type {
  BitableTableDef,
  FormFieldDef,
  BusinessRecord,
  BitableTableKey,
  LineCode,
} from '@shared/api.interface';

interface BitableFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableDef: BitableTableDef | null;
  tableName: string;
  taskId: string;
  internName: string;
  lineCode: LineCode;
  recordDate: string;
  records: BusinessRecord[];
  onRecordCreated: () => void;
}

const BitableFormDrawer = ({
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
}: BitableFormDrawerProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ enabled: boolean; configured: boolean }>({
    enabled: false,
    configured: false,
  });
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localRecords, setLocalRecords] = useState<BusinessRecord[]>(records);

  const defaultValues = useMemo(() => {
    if (!tableDef) return {};
    const defaults: Record<string, any> = {};
    for (const field of tableDef.fields) {
      if (field.autoFill === 'internName') {
        defaults[field.key] = internName;
      } else if (field.autoFill === 'today') {
        defaults[field.key] = recordDate;
      } else if (field.type === 'number') {
        defaults[field.key] = 0;
      } else {
        defaults[field.key] = '';
      }
    }
    return defaults;
  }, [tableDef, internName, recordDate]);

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

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const handleSubmit = async () => {
    if (!tableDef) return;

    if (!internName || !getInternByName(internName)) {
      toast.error('请先返回首页选择正确的实习生姓名');
      return;
    }

    const requiredFields = tableDef.fields.filter((f) => f.required);
    for (const field of requiredFields) {
      if (!formData[field.key] && formData[field.key] !== 0) {
        toast.error(`请填写${field.label}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await bitable.createRecord({
        tableKey: tableDef.tableKey as BitableTableKey,
        taskId,
        internName,
        lineCode,
        recordDate,
        fieldsData: formData,
      });

      if (result.synced) {
        toast.success('已保存并同步到飞书多维表格');
      } else if (result.syncError) {
        toast.warning(`已保存到本地，飞书同步失败：${result.syncError.slice(0, 50)}`);
      } else {
        toast.success('已保存到本地');
      }

      setFormData(defaultValues);
      onRecordCreated();
    } catch (error) {
      logger.error('提交记录失败', error);
      const msg = extractErrorMessage(error, '未知错误');
      toast.error(`提交失败：${msg.slice(0, 120)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await bitable.deleteRecord(id);
      setLocalRecords((prev) => prev.filter((r: BusinessRecord) => r.id !== id));
      setConfirmDeleteId(null);
      toast.success('已删除');
      onRecordCreated();
    } catch (error) {
      logger.error('删除记录失败', error);
      const msg = extractErrorMessage(error, '未知错误');
      toast.error(`删除失败：${msg.slice(0, 120)}`);
    } finally {
      setDeletingId(null);
    }
  };

  const renderField = (field: FormFieldDef) => {
    const value = formData[field.key] ?? '';

    if (field.type === 'select') {
      return (
        <Select value={value} onValueChange={(v: string) => handleFieldChange(field.key, v)}>
          <SelectTrigger>
            <SelectValue placeholder={`请选择${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt: string) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'date') {
      const dateValue = value ? parseDate(value) : undefined;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(parseDate(value), 'yyyy年MM月dd日', { locale: zhCN }) : `选择${field.label}`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(date: Date | undefined) => {
                if (date) {
                  handleFieldChange(field.key, format(date, 'yyyy-MM-dd'));
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (field.type === 'number') {
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          placeholder={`请输入${field.label}`}
        />
      );
    }

    if (field.type === 'textarea') {
      return (
        <Textarea
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          placeholder={`请输入${field.label}`}
          rows={3}
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

  const getRecordSummary = (record: BusinessRecord): string => {
    const fields = tableDef?.fields ?? [];
    const firstTextField = fields.find((f) => f.type === 'text' && !f.autoFill);
    if (firstTextField && record.fieldsData[firstTextField.key]) {
      return record.fieldsData[firstTextField.key];
    }
    return record.id.slice(0, 8);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{tableName}</SheetTitle>
          <SheetDescription>
            填写后数据将保存到本地
            {syncStatus.enabled ? '并同步到飞书多维表格' : syncStatus.configured ? '，飞书同步未启用' : '，飞书集成未配置'}
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
            {tableDef.fields.map((field: FormFieldDef) => (
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
            {localRecords.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                暂无已填写的记录
              </div>
            ) : (
              localRecords.map((record: BusinessRecord) => (
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
                      {record.feishuSyncStatus === 'skipped' && (
                        <span className="text-muted-foreground">仅本地保存</span>
                      )}
                      {record.feishuSyncStatus === 'pending' && (
                        <span className="text-warning">同步中...</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-2 shrink-0">
                    <AlertDialog open={confirmDeleteId === record.id} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(record.id)}
                          className="rounded-md p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors touch-manipulation"
                          title="删除记录"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除这条记录？</AlertDialogTitle>
                          <AlertDialogDescription>
                            删除后将同时移除本地记录和飞书多维表格中的对应数据，此操作不可撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(record.id);
                            }}
                            disabled={deletingId === record.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingId === record.id ? '删除中...' : '确认删除'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

export default BitableFormDrawer;
