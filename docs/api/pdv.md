# Evidencija PDV-a

`sef.vat`

```ts
sef.vat.individual // pojedinačna evidencija, verzija 2
sef.vat.group      // zbirna evidencija, verzija 2
sef.vat.v1         // stariji API
```

## Pojedinačna evidencija

```ts
record(body: IndividualVatRecordDto): Promise<IndividualVatRecordResponseDto>
correct(individualVatId: number, body: IndividualVatRecordDto): Promise<IndividualVatRecordResponseDto>
cancel(individualVatId: number): Promise<number>
get(individualVatId: number): Promise<IndividualVatRecordResponseDto>
list(window: { dateFrom: DateInput; dateTo: DateInput }): Promise<IndividualVatRecordListItemDto[]>
pdf(individualVatId: number): Promise<Uint8Array>
```

## Zbirna evidencija

```ts
record(body: GroupVatRecordDto): Promise<GroupVatRecordResponseDto>
correct(groupVatId: number, body: GroupVatRecordDto): Promise<GroupVatRecordResponseDto>
cancel(groupVatId: number): Promise<number>
get(groupVatId: number): Promise<GroupVatRecordResponseDto>
list(window): Promise<GroupVatRecordResponseDto[]>
pdf(groupVatId: number): Promise<Uint8Array>
```

## Stariji API

```ts
sef.vat.v1.individual.record(body, { individualVatId? }): Promise<IndividualVatDto>
sef.vat.v1.individual.get(id): Promise<IndividualVatDto>
sef.vat.v1.individual.list(window): Promise<IndividualVatListDto[]>
sef.vat.v1.individual.cancel(id): Promise<number>

sef.vat.v1.group.record(body, { groupVatId? }): Promise<GroupVatDto>
sef.vat.v1.group.get(id): Promise<GroupVatDto>
sef.vat.v1.group.list(window): Promise<GroupVatListDto[]>
sef.vat.v1.group.cancel(id): Promise<number>
```

Prosleđen identifikator u metodi `record()` pretvara poziv u ispravku ranijeg
zapisa.

## Konstante

U verziji 2 nabrojive vrednosti su celi brojevi. Spisak i vrednosti nalaze se u
vodiču [Evidencija PDV-a](/vodici/evidencija-pdv#nabrojive-vrednosti-su-brojevi).

```ts
import {
  VAT_PERIOD_V2,
  VAT_RECORDING_STATUS_V2,
  DOCUMENT_DIRECTION_V2,
  DOCUMENT_TYPE_V2,
  INTERNAL_INVOICE_OPTION_V2,
  RELATED_INVOICE_OPTION_V2,
  RELATED_INTERNAL_INVOICE_OPTION_V2,
} from 'efaktura-js'
```
