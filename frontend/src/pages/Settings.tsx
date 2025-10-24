import React, { useEffect, useState } from 'react';
import { Card, Input, Button, Alert } from '../components/ui';
import { companySettingsApi, emailSettingsApi } from '../services/api';
import type { CompanySettings, EmailSettings } from '../types';

const Settings: React.FC = () => {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const [companyRes, emailRes] = await Promise.all([
        companySettingsApi.get(),
        emailSettingsApi.get(),
      ]);
      setCompanySettings(companyRes.data);
      setEmailSettings(emailRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!companySettings) return;

    try {
      await companySettingsApi.update(companySettings);
      setSuccess('Company settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update company settings');
    }
  };

  const handleUpdateEmail = async () => {
    if (!emailSettings) return;

    try {
      await emailSettingsApi.update(emailSettings);
      setSuccess('Email settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update email settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <Card title="Company Settings">
        {companySettings && (
          <div className="space-y-4">
            <Input
              label="Company Name"
              value={companySettings.company_name}
              onChange={(e) => setCompanySettings({ ...companySettings, company_name: e.target.value })}
              fullWidth
            />
            <Input
              label="Company Email"
              type="email"
              value={companySettings.company_email || ''}
              onChange={(e) => setCompanySettings({ ...companySettings, company_email: e.target.value })}
              fullWidth
            />
            <Input
              label="Company Phone"
              value={companySettings.company_phone || ''}
              onChange={(e) => setCompanySettings({ ...companySettings, company_phone: e.target.value })}
              fullWidth
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tax Rate (%)"
                type="number"
                step="0.01"
                value={companySettings.tax_rate}
                onChange={(e) => setCompanySettings({ ...companySettings, tax_rate: parseFloat(e.target.value) })}
                fullWidth
              />
              <Input
                label="Payment Terms (days)"
                type="number"
                value={companySettings.payment_terms}
                onChange={(e) => setCompanySettings({ ...companySettings, payment_terms: parseInt(e.target.value) })}
                fullWidth
              />
            </div>
            <Button onClick={handleUpdateCompany}>Update Company Settings</Button>
          </div>
        )}
      </Card>

      <Card title="Email Settings">
        {emailSettings && (
          <div className="space-y-4">
            <Input
              label="SMTP Host"
              value={emailSettings.smtp_host || ''}
              onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
              fullWidth
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="SMTP Port"
                type="number"
                value={emailSettings.smtp_port || ''}
                onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: parseInt(e.target.value) })}
                fullWidth
              />
              <Input
                label="SMTP Username"
                value={emailSettings.smtp_username || ''}
                onChange={(e) => setEmailSettings({ ...emailSettings, smtp_username: e.target.value })}
                fullWidth
              />
            </div>
            <Input
              label="From Email"
              type="email"
              value={emailSettings.smtp_from_email || ''}
              onChange={(e) => setEmailSettings({ ...emailSettings, smtp_from_email: e.target.value })}
              fullWidth
            />
            <Button onClick={handleUpdateEmail}>Update Email Settings</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Settings;
