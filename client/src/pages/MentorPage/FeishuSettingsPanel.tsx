import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { Settings, Check, AlertTriangle, X } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Switch } from '@client/src/components/ui/switch';
import { Label } from '@client/src/components/ui/label';
import { bitable } from '@client/src/api';
import type { FeishuBitableConfig, UpdateFeishuConfigRequest } from '@shared/api.interface';

interface FeishuSettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const FeishuSettingsPanel = ({ open, onClose }: FeishuSettingsPanelProps) => {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [baseToken, setBaseToken] = useState('YOUR_BASE_TOKEN');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  useEffect(() => {
    if (open) {
      bitable.getFeishuConfig()
        .then((config: FeishuBitableConfig | null) => {
          if (config) {
            setAppId(config.appId ?? '');
            setBaseToken(config.baseToken);
            setEnabled(config.enabled);
            setSyncEnabled(config.enabled);
            setConfigured(!!config.appId);
          }
        })
        .catch((err) => logger.warn('加载飞书配置失败', err));
    }
  }, [open]);

  const handleSave = async () => {
    if (!appId || !appSecret) {
      toast.error('请填写 App ID 和 App Secret');
      return;
    }

    setSaving(true);
    try {
      const dto: UpdateFeishuConfigRequest = {
        appId,
        appSecret,
        baseToken: baseToken || undefined,
        enabled,
      };
      await bitable.saveFeishuConfig(dto);
      setConfigured(true);
      setSyncEnabled(enabled);
      toast.success(enabled ? '飞书集成已启用' : '配置已保存');
      onClose();
    } catch (error) {
      logger.error('保存飞书配置失败', error);
      toast.error('保存失败，请检查凭证是否正确');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="size-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">飞书集成设置</h3>
          {syncEnabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              <Check className="size-3" />
              同步已启用
            </span>
          ) : configured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
              <AlertTriangle className="size-3" />
              已配置未启用
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              未配置
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="appId">飞书应用 App ID</Label>
            <Input
              id="appId"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="cli_xxxxxxxxxxxxxx"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="appSecret">App Secret</Label>
            <Input
              id="appSecret"
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder={configured ? '********' : '请输入 App Secret'}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="baseToken">多维表格 Base Token</Label>
          <Input
            id="baseToken"
            value={baseToken}
            onChange={(e) => setBaseToken(e.target.value)}
            placeholder="YOUR_BASE_TOKEN"
          />
          <p className="text-xs text-muted-foreground">
            默认值为项目多维表格 token，如需对接其他表格可修改
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <Label className="text-sm font-medium text-foreground">
              启用飞书同步
            </Label>
            <p className="text-xs text-muted-foreground">
              启用后，所有业务记录和打卡记录将同步写入飞书多维表格
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeishuSettingsPanel;
