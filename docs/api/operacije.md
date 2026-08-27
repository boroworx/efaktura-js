<!-- Generisano skriptom scripts/generate.mjs. Ne menjajte ručno. -->

# Sve operacije

Tabela je generisana iz zvaničnih OpenAPI dokumenata SEF-a, pa uvek odgovara
stvarnom stanju API-ja. Ukupno operacija: **85**.

Ključ iz prve kolone prosleđuje se metodi `sef.http.call()`:

```ts
await sef.http.call('getPurchaseInvoiceOverview', {
  query: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
})
```

Za svakodnevni rad koristite imenovane metode iz prostora imena; ovaj spisak
služi kada vam treba operacija koju one ne izlažu.

| Ključ | Metoda | Putanja | Telo | Odgovor |
| --- | --- | --- | --- | --- |
| `getCirTicketsByCirInvoiceIdByOnlyActiveTickets` | GET | `/api/publicApi/cir-tickets/{cirInvoiceId}/{onlyActiveTickets}` | – | JSON |
| `postCirTicketsAddCirTicket` | POST | `/api/publicApi/cir-tickets/addCirTicket` | JSON | JSON |
| `postCirTicketsFind` | POST | `/api/publicApi/cir-tickets/find` | JSON | JSON |
| `getCirTicketsGetCirTicketHistoryByCirTicketId` | GET | `/api/publicApi/cir-tickets/getCirTicketHistory/{cirTicketId}` | – | JSON |
| `postCompanyCheckIfCompanyRegisteredOnEfaktura` | POST | `/api/publicApi/Company/CheckIfCompanyRegisteredOnEfaktura` | JSON | JSON |
| `putCompanyUpdateCompany` | PUT | `/api/publicApi/company/update-company` | – | JSON |
| `getCustomsAdministrationImportDeclarationsByCustomsDeclarationId` | GET | `/api/publicApi/customs-administration/import-declarations/{customsDeclarationId}` | – | JSON |
| `getCustomsAdministrationImportDeclarationsByCustomsDeclarationIdVersionByVersion` | GET | `/api/publicApi/customs-administration/import-declarations/{customsDeclarationId}/version/{version}` | – | JSON |
| `getCustomsAdministrationImportDeclarationsByCustomsDeclarationIdVersionByVersionItemsByItemOrdinalNumber` | GET | `/api/publicApi/customs-administration/import-declarations/{customsDeclarationId}/version/{version}/items/{itemOrdinalNumber}` | – | JSON |
| `getCustomsAdministrationImportDeclarationsChanges` | GET | `/api/publicApi/customs-administration/import-declarations/changes` | – | JSON |
| `postCustomsAdministrationImportDeclarationsIds` | POST | `/api/publicApi/customs-administration/import-declarations/ids` | – | JSON |
| `getDownloadAllCompanies` | GET | `/api/publicApi/downloadAllCompanies` | – | JSON |
| `getEfiscalizationPurchaseFiscalBillByDateToGet` | GET | `/api/publicApi/efiscalization/purchase/fiscal-bill/{dateToGet}` | – | JSON |
| `getEfiscalizationPurchaseFiscalBillByFiscalBillNumber` | GET | `/api/publicApi/efiscalization/purchase/fiscal-bill/{fiscalBillNumber}` | – | JSON |
| `getEfiscalizationSalesFiscalBillByDateToGet` | GET | `/api/publicApi/efiscalization/sales/fiscal-bill/{dateToGet}` | – | JSON |
| `getEfiscalizationSalesFiscalBillByFiscalBillNumber` | GET | `/api/publicApi/efiscalization/sales/fiscal-bill/{fiscalBillNumber}` | – | JSON |
| `getGetUnitMeasures` | GET | `/api/publicApi/get-unit-measures` | – | JSON |
| `getGetAllCompanies` | GET | `/api/publicApi/getAllCompanies` | – | JSON |
| `getGetEfakturaVersion` | GET | `/api/publicApi/getEfakturaVersion` | – | JSON |
| `getPublicPurchaseContractorInvoice` | GET | `/api/publicApi/public-purchase-contractor-invoice` | – | JSON |
| `postPublicPurchaseContractorInvoiceChanges` | POST | `/api/publicApi/public-purchase-contractor-invoice/changes` | – | JSON |
| `postPublicPurchaseContractorInvoiceIds` | POST | `/api/publicApi/public-purchase-contractor-invoice/ids` | – | JSON |
| `getPublicPurchaseContractorInvoiceSignature` | GET | `/api/publicApi/public-purchase-contractor-invoice/signature` | – | datoteka |
| `getPublicPurchaseContractorInvoiceXml` | GET | `/api/publicApi/public-purchase-contractor-invoice/xml` | – | datoteka |
| `getPurchaseCirInvoiceGetInvoicePaymentsAndHistoryByCirInvoiceId` | GET | `/api/publicApi/purchase-cir-invoice/getInvoicePaymentsAndHistory/{cirInvoiceId}` | – | JSON |
| `getPurchaseCirInvoiceGetPurchaseInvoiceAssignationHistoryByCirInvoiceId` | GET | `/api/publicApi/purchase-cir-invoice/getPurchaseInvoiceAssignationHistory/{cirInvoiceId}` | – | JSON |
| `getPurchaseInvoice` | GET | `/api/publicApi/purchase-invoice` | – | JSON |
| `postPurchaseInvoiceByCirInvoiceIdAssign` | POST | `/api/publicApi/purchase-invoice/{cirInvoiceId}/assign` | – | JSON |
| `getPurchaseInvoiceByCirInvoiceIdCancelassign` | GET | `/api/publicApi/purchase-invoice/{cirInvoiceId}/cancelassign` | – | JSON |
| `postPurchaseInvoiceAcceptRejectPurchaseInvoice` | POST | `/api/publicApi/purchase-invoice/acceptRejectPurchaseInvoice` | JSON | JSON |
| `postPurchaseInvoiceAcceptRejectPurchaseInvoiceByCirInvoiceId` | POST | `/api/publicApi/purchase-invoice/acceptRejectPurchaseInvoiceByCirInvoiceId` | JSON | JSON |
| `postPurchaseInvoiceChanges` | POST | `/api/publicApi/purchase-invoice/changes` | – | JSON |
| `postPurchaseInvoiceIds` | POST | `/api/publicApi/purchase-invoice/ids` | – | JSON |
| `getPurchaseInvoiceOverview` | GET | `/api/publicApi/purchase-invoice/overview` | – | JSON |
| `getPurchaseInvoicePdf` | GET | `/api/publicApi/purchase-invoice/pdf` | – | datoteka |
| `getPurchaseInvoiceSignature` | GET | `/api/publicApi/purchase-invoice/signature` | – | datoteka |
| `getPurchaseInvoiceStatusHistoryByInvoiceIdPdf` | GET | `/api/publicApi/purchase-invoice/status-history/{invoiceId}/pdf` | – | datoteka |
| `getPurchaseInvoiceUblByCirInvoiceId` | GET | `/api/publicApi/purchase-invoice/ubl/{cirInvoiceId}` | – | datoteka |
| `postPurchaseInvoiceVatReverseCharge` | POST | `/api/publicApi/purchase-invoice/vatReverseCharge` | JSON | JSON |
| `getPurchaseInvoiceXml` | GET | `/api/publicApi/purchase-invoice/xml` | – | datoteka |
| `getRecipientsNoticeOnInputVatRecipientByNoticeId` | GET | `/api/publicApi/recipients-notice-on-input-vat/recipient/{noticeId}` | – | JSON |
| `getRecipientsNoticeOnInputVatRecipientByNoticeIdPdf` | GET | `/api/publicApi/recipients-notice-on-input-vat/recipient/{noticeId}/pdf` | – | datoteka |
| `getRecipientsNoticeOnInputVatRecipientDateRange` | GET | `/api/publicApi/recipients-notice-on-input-vat/recipient/date-range` | – | JSON |
| `getRecipientsNoticeOnInputVatSenderByNoticeId` | GET | `/api/publicApi/recipients-notice-on-input-vat/sender/{noticeId}` | – | JSON |
| `getRecipientsNoticeOnInputVatSenderByNoticeIdPdf` | GET | `/api/publicApi/recipients-notice-on-input-vat/sender/{noticeId}/pdf` | – | datoteka |
| `getRecipientsNoticeOnInputVatSenderDateRange` | GET | `/api/publicApi/recipients-notice-on-input-vat/sender/date-range` | – | JSON |
| `getRecipientsNoticeOnInputVatSenderMistakeStatus` | GET | `/api/publicApi/recipients-notice-on-input-vat/sender/mistake-status` | – | JSON |
| `postRecipientsNoticeOnInputVatSenderSend` | POST | `/api/publicApi/recipients-notice-on-input-vat/sender/send` | JSON | JSON |
| `getSalesCirInvoiceGetInvoicePaymentsAndHistoryByCirInvoiceId` | GET | `/api/publicApi/sales-cir-invoice/getInvoicePaymentsAndHistory/{cirInvoiceId}` | – | JSON |
| `getSalesCirInvoiceGetSalesInvoiceAssignationHistoryByCirInvoiceId` | GET | `/api/publicApi/sales-cir-invoice/getSalesInvoiceAssignationHistory/{cirInvoiceId}` | – | JSON |
| `deleteSalesInvoice` | DELETE | `/api/publicApi/sales-invoice` | JSON | JSON |
| `getSalesInvoice` | GET | `/api/publicApi/sales-invoice` | – | JSON |
| `deleteSalesInvoiceByInvoiceId` | DELETE | `/api/publicApi/sales-invoice/{invoiceId}` | – | JSON |
| `postSalesInvoiceCancel` | POST | `/api/publicApi/sales-invoice/cancel` | JSON | JSON |
| `postSalesInvoiceChanges` | POST | `/api/publicApi/sales-invoice/changes` | – | JSON |
| `getSalesInvoiceGetValueAddedTaxExemptionReasonList` | GET | `/api/publicApi/sales-invoice/getValueAddedTaxExemptionReasonList` | – | JSON |
| `postSalesInvoiceIds` | POST | `/api/publicApi/sales-invoice/ids` | – | JSON |
| `getSalesInvoicePdf` | GET | `/api/publicApi/sales-invoice/pdf` | – | datoteka |
| `getSalesInvoiceSignature` | GET | `/api/publicApi/sales-invoice/signature` | – | datoteka |
| `getSalesInvoiceStatusHistoryByInvoiceIdPdf` | GET | `/api/publicApi/sales-invoice/status-history/{invoiceId}/pdf` | – | datoteka |
| `postSalesInvoiceStorno` | POST | `/api/publicApi/sales-invoice/storno` | JSON | JSON |
| `postSalesInvoiceUbl` | POST | `/api/publicApi/sales-invoice/ubl` | XML | JSON |
| `postSalesInvoiceUblUpload` | POST | `/api/publicApi/sales-invoice/ubl/upload` | multipart | JSON |
| `getSalesInvoiceXml` | GET | `/api/publicApi/sales-invoice/xml` | – | datoteka |
| `postSubscribe` | POST | `/api/publicApi/subscribe` | – | tekst |
| `getVatRecordingGroup` | GET | `/api/publicApi/vat-recording/group` | – | JSON |
| `postVatRecordingGroup` | POST | `/api/publicApi/vat-recording/group` | JSON | JSON |
| `getVatRecordingGroupByGroupVatId` | GET | `/api/publicApi/vat-recording/group/{groupVatId}` | – | JSON |
| `postVatRecordingGroupCancelByGroupVatId` | POST | `/api/publicApi/vat-recording/group/cancel/{groupVatId}` | – | JSON |
| `getVatRecordingIndividual` | GET | `/api/publicApi/vat-recording/individual` | – | JSON |
| `postVatRecordingIndividual` | POST | `/api/publicApi/vat-recording/individual` | JSON | JSON |
| `getVatRecordingIndividualByIndividualVatId` | GET | `/api/publicApi/vat-recording/individual/{individualVatId}` | – | JSON |
| `postVatRecordingIndividualCancelByIndividualVatId` | POST | `/api/publicApi/vat-recording/individual/cancel/{individualVatId}` | – | JSON |
| `v2GetVatRecordingGroup` | GET | `/api/v2/publicApi/vat-recording/group` | – | JSON |
| `v2PostVatRecordingGroup` | POST | `/api/v2/publicApi/vat-recording/group` | JSON | JSON |
| `v2GetVatRecordingGroupByGroupVatId` | GET | `/api/v2/publicApi/vat-recording/group/{groupVatId}` | – | JSON |
| `v2GetVatRecordingGroupByGroupVatIdPdf` | GET | `/api/v2/publicApi/vat-recording/group/{groupVatId}/pdf` | – | datoteka |
| `v2PostVatRecordingGroupCancelByGroupVatId` | POST | `/api/v2/publicApi/vat-recording/group/cancel/{groupVatId}` | – | JSON |
| `v2PostVatRecordingGroupCorrectionByGroupVatId` | POST | `/api/v2/publicApi/vat-recording/group/correction/{groupVatId}` | JSON | JSON |
| `v2GetVatRecordingIndividual` | GET | `/api/v2/publicApi/vat-recording/individual` | – | JSON |
| `v2PostVatRecordingIndividual` | POST | `/api/v2/publicApi/vat-recording/individual` | JSON | JSON |
| `v2GetVatRecordingIndividualByIndividualVatId` | GET | `/api/v2/publicApi/vat-recording/individual/{individualVatId}` | – | JSON |
| `v2GetVatRecordingIndividualByIndividualVatIdPdf` | GET | `/api/v2/publicApi/vat-recording/individual/{individualVatId}/pdf` | – | datoteka |
| `v2PostVatRecordingIndividualCancelByIndividualVatId` | POST | `/api/v2/publicApi/vat-recording/individual/cancel/{individualVatId}` | – | JSON |
| `v2PostVatRecordingIndividualCorrectionByIndividualVatId` | POST | `/api/v2/publicApi/vat-recording/individual/correction/{individualVatId}` | JSON | JSON |
