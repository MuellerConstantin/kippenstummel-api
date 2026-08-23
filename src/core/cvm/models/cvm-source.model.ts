/**
 * The origins an import may declare.
 *
 * This is the origin of the data itself, not the channel it arrived through — a file a
 * moderator uploads may well hold an OpenStreetMap extract. The importing endpoints
 * therefore ask for it explicitly instead of inferring it from how the import was
 * triggered.
 */
export type CvmImportSource = 'osm' | 'operator';

/**
 * The origin of the data a CVM currently holds.
 *
 * Imports and synchronizations overwrite it, so this answers where the data stands
 * today, not everything that ever touched the record. The full provenance is the event
 * stream and is not duplicated here.
 */
export type CvmSource = CvmImportSource | 'community';

/**
 * The origins selectable when triggering an import.
 */
export const CVM_IMPORT_SOURCES: CvmImportSource[] = ['osm', 'operator'];

/**
 * All origins a CVM can be recorded with.
 */
export const CVM_SOURCES: CvmSource[] = ['osm', 'operator', 'community'];
