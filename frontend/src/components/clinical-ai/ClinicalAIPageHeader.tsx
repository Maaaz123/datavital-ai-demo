import type { ReactNode } from 'react';
import DomainPageHeader from '@/components/product/DomainPageHeader';

interface ClinicalAIPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function ClinicalAIPageHeader({ title, subtitle, actions }: ClinicalAIPageHeaderProps) {
  return (
    <DomainPageHeader
      eyebrow="CLINICAL AI / GOVERNED INTELLIGENCE"
      title={title}
      subtitle={subtitle}
      actions={actions}
    />
  );
}
