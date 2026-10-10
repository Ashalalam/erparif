# Implementation Plan: BillSprout Smart ERP Rebranding

## Overview

This rebranding project updates all user-facing text, metadata, documentation, and code references from "Pharmacy ERP" to "BillSprout Smart ERP" with the tagline "Fast Billing System by LifeSprouts Care". The implementation focuses on text substitution while preserving all application functionality, code logic, and database schema.

**Technology**: React 18.2.0 with JSX, Vite 5.0.0, npm

## Tasks

- [ ] 1. Update static HTML files and package configuration
  - [ ] 1.1 Update index.html metadata and title
    - Modify `<title>` tag from "Pharmacy ERP - Management System" to "BillSprout Smart ERP - Fast Billing System by LifeSprouts Care"
    - Update `<meta name="description">` tag if present to reference "BillSprout Smart ERP"
    - Update Open Graph and Twitter Card meta tags if present
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 1.2 Update package.json name and description
    - Change `"name"` field from "pharmacy-erp" to "billsprout-smart-erp"
    - Add or update `"description"` field to "BillSprout Smart ERP - Fast Billing System by LifeSprouts Care"
    - Verify all dependencies and scripts remain unchanged
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 1.3 Write unit tests for metadata changes
    - Test that index.html title contains "BillSprout Smart ERP"
    - Test that package.json name equals "billsprout-smart-erp"
    - Test that package.json description contains "BillSprout Smart ERP"
    - _Requirements: 1.1, 5.1_

- [ ] 2. Checkpoint - Verify static files
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Update React UI components
  - [ ] 3.1 Update LoginPage.jsx branding
    - Replace heading text from "Pharmacy ERP" to "BillSprout Smart ERP"
    - Add tagline "Fast Billing System by LifeSprouts Care" as new paragraph below heading
    - Maintain existing CSS classes and layout structure
    - Preserve all form inputs, validation, and authentication handlers
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 3.2 Update AdminLayout.jsx sidebar branding
    - Replace sidebar header text from "Pharmacy ERP" to "BillSprout Smart ERP"
    - Keep existing "Rx" logo icon unchanged
    - Verify text fits within sidebar width constraints (256px)
    - Maintain all navigation links, icons, and routing logic
    - _Requirements: 3.1, 3.3_
  
  - [ ] 3.3 Update SupabaseSetup.jsx branding
    - Search component for all string literals containing "Pharmacy ERP"
    - Replace with "BillSprout Smart ERP"
    - Update "Pharmacy ERP system" to "BillSprout Smart ERP system"
    - Preserve all component logic, state management, and instructional content
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 3.4 Write unit tests for UI component text
    - Test LoginPage renders "BillSprout Smart ERP" heading
    - Test LoginPage renders tagline "Fast Billing System by LifeSprouts Care"
    - Test AdminLayout sidebar displays "BillSprout Smart ERP"
    - Test SupabaseSetup contains no "Pharmacy ERP" references
    - _Requirements: 2.1, 2.2, 3.1, 4.1_

- [ ] 4. Checkpoint - Verify UI components
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Update documentation files
  - [ ] 5.1 Update README.md branding
    - Replace all instances of "Pharmacy ERP" with "BillSprout Smart ERP"
    - Update main heading to "BillSprout Smart ERP - Fast Billing System by LifeSprouts Care"
    - Maintain existing documentation structure and technical content
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 5.2 Update SQL file comments
    - Search all SQL files (*.sql) for comments containing "Pharmacy ERP"
    - Replace comment text with "BillSprout Smart ERP"
    - Verify NO changes to SQL table names, column names, constraints, or functional SQL code
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 5.3 Write property test for documentation completeness
    - **Property 2: No Legacy Branding in Documentation**
    - **Validates: Requirements 9.2, 6.1, 7.1, 7.2**
    - Test that README.md contains no "Pharmacy ERP" strings
    - Test that SQL file comments contain no "Pharmacy ERP" strings

- [ ] 6. Update code comments and string literals
  - [ ] 6.1 Search and replace string literals in JSX/JS files
    - Use case-sensitive search across all `.jsx` and `.js` files in `src/` directory
    - Replace string literals: `"Pharmacy ERP"` → `"BillSprout Smart ERP"`
    - Exclude: variable names, function names, CSS class names, import paths
    - _Requirements: 8.1, 8.4_
  
  - [ ] 6.2 Update code comments
    - Search all `.jsx` and `.js` files for comments containing "Pharmacy ERP"
    - Replace with "BillSprout Smart ERP"
    - Verify NO changes to variable names, function names, or programmatic identifiers
    - _Requirements: 8.2, 8.3, 8.4_
  
  - [ ]* 6.3 Write property tests for comprehensive branding
    - **Property 1: No Legacy Branding in UI Components**
    - **Validates: Requirements 9.1**
    - Test that no JSX files contain string literals with "Pharmacy ERP"
    - **Property 3: No Legacy Branding in Code Comments**
    - **Validates: Requirements 8.2**
    - Test that no code comments contain "Pharmacy ERP"
    - **Property 4: No Legacy Branding in String Literals**
    - **Validates: Requirements 8.1, 4.1**
    - Test that no user-facing string literals contain "Pharmacy ERP"

- [ ] 7. Verify code structure preservation
  - [ ] 7.1 Verify no unintended changes to code structure
    - Check that all variable names remain unchanged
    - Check that all function names remain unchanged
    - Check that all file paths remain unchanged
    - Check that all import statements remain functional
    - _Requirements: 8.3, 10.5_
  
  - [ ]* 7.2 Write property tests for code structure preservation
    - **Property 6: Code Identifiers Unchanged**
    - **Validates: Requirements 8.3**
    - Test that variable/function names match pre-rebranding snapshot
    - **Property 7: SQL Schema Unchanged**
    - **Validates: Requirements 7.3**
    - Test that SQL table/column names remain unchanged
    - **Property 8: File Structure Unchanged**
    - **Validates: Requirements 10.5**
    - Test that file paths match pre-rebranding state

- [ ] 8. Final integration and validation
  - [ ] 8.1 Run full development build
    - Execute `npm run dev` to verify development build succeeds
    - Check browser console for any errors
    - Verify application loads without issues
    - _Requirements: 10.2, 10.4_
  
  - [ ] 8.2 Run production build verification
    - Execute `npm run build` to verify production build succeeds
    - Compare build artifact sizes before/after (should be <1KB difference)
    - Verify no build warnings or errors
    - _Requirements: 10.2, 10.5_
  
  - [ ]* 8.3 Write integration tests for functional preservation
    - **Property 5: Consistent Brand Name in UI**
    - **Validates: Requirements 9.3**
    - Test that all brand name displays use exactly "BillSprout Smart ERP" with correct capitalization
    - Test authentication flows work correctly
    - Test routing and navigation function correctly
    - Test database operations execute successfully
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 9. Final checkpoint - Complete validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- This is a text-substitution focused rebranding with NO code logic changes
- Database schema remains completely unchanged
- All existing functionality must be preserved
- Checkpoints ensure incremental validation throughout the implementation
- Property tests validate universal correctness properties from the design document
- Manual testing should verify: browser tab title, login page display, admin sidebar, navigation flows

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "6.1", "6.2"] },
    { "id": 5, "tasks": ["6.3", "7.1"] },
    { "id": 6, "tasks": ["7.2", "8.1"] },
    { "id": 7, "tasks": ["8.2", "8.3"] }
  ]
}
```
