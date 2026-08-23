import { IsDefined, IsIn } from 'class-validator';
import { type CvmImportSource, CVM_IMPORT_SOURCES } from 'src/core/cvm/models';

export class ImportFileDto {
  /**
   * Where the uploaded records originate from. Asked for explicitly because the
   * endpoint cannot tell an own survey from an OpenStreetMap extract.
   */
  @IsDefined()
  @IsIn(CVM_IMPORT_SOURCES)
  public source!: CvmImportSource;
}
