'use strict';

const COMPANY_THEME_VALUES = Object.freeze(['original', 'blue-black', 'green-black']);

function validateCompanyTheme(value, { defaultWhenMissing = true } = {}) {
  if ((value === undefined || value === null || value === '') && defaultWhenMissing) return 'original';
  if (!COMPANY_THEME_VALUES.includes(value)) {
    const error = new Error('Invalid theme. Choose Original, Blue & Black, or Green & Black.');
    error.statusCode = 400;
    throw error;
  }
  return value;
}

/** Run BEFORE mongoose.model('Company', companySchema) is compiled. */
function installCompanyThemeField(companySchema) {
  if (!companySchema.path('theme')) {
    companySchema.add({ theme: { type: String, enum: COMPANY_THEME_VALUES, default: 'original' } });
  }
  return companySchema;
}

module.exports = { COMPANY_THEME_VALUES, validateCompanyTheme, installCompanyThemeField };