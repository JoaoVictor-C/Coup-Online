import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation(['common']);
  
  return (
    <footer className="footer">
      <p>{t('common:footer.copyright', { year: new Date().getFullYear() })}</p>
    </footer>
  );
};

export default Footer;