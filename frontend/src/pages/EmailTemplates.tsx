import React, { useEffect, useState } from 'react';
import { Card, DataTable, Badge } from '../components/ui';
import { emailTemplatesApi } from '../services/api';
import type { EmailTemplate, Column } from '../types';

const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await emailTemplatesApi.getAll();
      setTemplates(response.data);
    } catch (err) {
      console.error('Failed to load email templates', err);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: Column<EmailTemplate>[] = [
    { key: 'template_name', header: 'Template Name', width: '25%' },
    {
      key: 'template_type',
      header: 'Type',
      width: '15%',
      render: (template) => (
        <Badge variant="info" size="sm">
          {template.template_type}
        </Badge>
      ),
    },
    { key: 'subject', header: 'Subject', width: '40%' },
    {
      key: 'variables',
      header: 'Variables',
      width: '20%',
      render: (template) => template.variables?.length || 0,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>

      <Card>
        <DataTable
          data={templates}
          columns={columns}
          keyExtractor={(template) => template.id}
          isLoading={isLoading}
          emptyMessage="No email templates found"
        />
      </Card>
    </div>
  );
};

export default EmailTemplates;
