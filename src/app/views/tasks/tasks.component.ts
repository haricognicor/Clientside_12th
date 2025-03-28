import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  date: string;
  url: string;
  uploadedBy: 'client' | 'company' | 'unknown' | 'cognicor';
  amount?: number;
  plan?: string;
  status?: string;
}

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatButtonModule,
    MatProgressBarModule,
    FormsModule
  ]
})
export class TasksComponent implements OnInit, AfterViewInit {
  @ViewChild('stepper') stepper!: MatStepper;

  private apiBaseUrl = 'https://fe36-14-143-149-238.ngrok-free.app';
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  thirdFormGroup: FormGroup;
  fourthFormGroup: FormGroup;

  activeStepIndex: number = 0;
  uploadedDraftFiles: UploadedFile[] = [];
  filteredDraftFiles: UploadedFile[] = [];
  uploadedFinalContracts: UploadedFile[] = [];
  finalContract: UploadedFile | null = null;
  uploadedInvoiceFiles: UploadedFile[] = [];
  filteredInvoiceFiles: UploadedFile[] = [];
  unpaidInvoices: UploadedFile[] = [];

  searchQuery: string = '';
  sortOrder: string = 'desc';
  invoiceSearchQuery: string = '';
  invoiceSortOrder: string = 'desc';

  isUploading: boolean = false;
  fileName: string = '';
  fileSize: string = '';
  uploadProgress: number = 0;

  selectedClient: { username: string; client_id: string } = { username: '', client_id: '' };
  isClientDataMissing: boolean = false;
  draftContractsError: string | null = null;

  constructor(
    private _formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    public router: Router,
    private http: HttpClient
  ) {
    this.firstFormGroup = this._formBuilder.group({ draftContracts: [''] });
    this.secondFormGroup = this._formBuilder.group({ finalContract: [''] });
    this.thirdFormGroup = this._formBuilder.group({ invoices: [''] });
    this.fourthFormGroup = this._formBuilder.group({ payment: [''] });
  }

  ngOnInit() {
    // Since we're hardcoding username and client_id in loadClientData,
    // we can directly call loadClientData without checking route params or sessionStorage
    this.loadClientData('0001'); // Pass a dummy clientId since it's not used in the API call
  }

  ngAfterViewInit() {
    this.activeStepIndex = this.stepper.selectedIndex;
    this.refreshStepData();
    this.cdr.detectChanges();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public loadClientData(clientId: string) {
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': '69420'
    });

    // Hardcode the username and client_id as per your code
    this.selectedClient.username = 'LPL';
    this.selectedClient.client_id = '0001';

    if (this.selectedClient.username && this.selectedClient.client_id) {
      // Fetch draft contracts
      this.draftContractsError = null;
      this.http.get(`${this.apiBaseUrl}/list-contract/${this.selectedClient.username}/${this.selectedClient.client_id}/`, { headers }).subscribe(
        (response: any) => {
          console.log('Fetched draft contracts:', response);
          this.uploadedDraftFiles = (response.contracts || []).map((contract: any) => ({
            name: contract.filename || contract.name || 'Unknown',
            size: contract.size || 'Unknown', // API doesn't provide size
            type: this.getFileType(contract.filename || contract.name || 'unknown'),
            date: contract.date || new Date().toLocaleString(), // API doesn't provide date
            url: contract.url || `${this.apiBaseUrl}/files/${contract.filename}`, // API doesn't provide url, use fallback
            uploadedBy: contract.from || 'unknown',
            status: contract.status || 'Pending', // API doesn't provide status
            amount: contract.amount || 0, // API doesn't provide amount
            plan: contract.plan || 'Basic' // API doesn't provide plan
          }));
          this.filteredDraftFiles = [...this.uploadedDraftFiles];
          this.sortFiles();
          this.filterFiles();
          this.cdr.detectChanges();
        },
        error => {
          console.error('Error fetching draft contracts:', error);
          this.draftContractsError = 'Failed to load draft contracts. Please try again later.';
          this.uploadedDraftFiles = [];
          this.filteredDraftFiles = [];
          this.cdr.detectChanges();
        }
      );

      // Fetch final contracts
      this.http.get(`${this.apiBaseUrl}/list-final-contract/${this.selectedClient.username}/${this.selectedClient.client_id}`, { headers }).subscribe(
        (response: any) => {
          console.log('Fetched final contracts:', response);
          this.uploadedFinalContracts = (response.final_contracts || []).map((contract: any) => ({
            name: contract.filename || contract.name || 'Unknown',
            size: contract.size || 'Unknown',
            type: this.getFileType(contract.filename || contract.name || 'unknown'),
            date: contract.date || new Date().toLocaleString(),
            url: contract.url || `${this.apiBaseUrl}/files/${contract.filename}`,
            uploadedBy: contract.from || 'unknown',
            status: contract.status || 'Pending',
            amount: contract.amount || 0,
            plan: contract.plan || 'Basic'
          }));
          this.finalContract = this.uploadedFinalContracts.length > 0 ? this.uploadedFinalContracts[0] : null;
          this.cdr.detectChanges();
        },
        error => {
          console.error('Error fetching final contracts:', error);
          alert('Failed to load final contracts. Please try again.');
        }
      );

      // Fetch invoices
      this.http.get(`${this.apiBaseUrl}/list-bill/${this.selectedClient.client_id}/`, { headers }).subscribe(
        (data: any) => {
          console.log('Fetched invoices:', data);
          this.uploadedInvoiceFiles = (data.invoices || []).map((invoice: any) => ({
            name: invoice.name || 'Unknown',
            size: invoice.size || 'Unknown',
            type: this.getFileType(invoice.name || 'unknown'),
            date: invoice.date || new Date().toLocaleString(),
            url: invoice.url || `${this.apiBaseUrl}/files/${invoice.name}`,
            uploadedBy: invoice.from || 'unknown',
            status: invoice.status || 'Pending',
            amount: invoice.amount || 0,
            plan: invoice.plan || 'Basic'
          }));
          this.filteredInvoiceFiles = [...this.uploadedInvoiceFiles];
          this.unpaidInvoices = this.uploadedInvoiceFiles.filter(invoice => invoice.status === 'Pending');
          this.sortInvoiceFiles();
          this.filterInvoiceFiles();
          this.cdr.detectChanges();
        },
        error => {
          console.error('Error fetching client data:', error);
        }
      );
    } else {
      console.warn('Skipping API requests due to missing client data.');
    }
  }

  public getFileType(fileName: string): string {
    return fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN';
  }

  onStepChange(index: number): void {
    this.activeStepIndex = index;
    this.refreshStepData();
    console.log('Step changed to:', index);
  }

  filterFiles(): void {
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredDraftFiles = query
      ? this.uploadedDraftFiles.filter(file =>
          file.name.toLowerCase().includes(query) || file.date.toLowerCase().includes(query))
      : [...this.uploadedDraftFiles];
    console.log('Filtering files with query:', this.searchQuery);
  }

  sortFiles(): void {
    this.uploadedDraftFiles.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    this.filterFiles();
    console.log('Sorting files with order:', this.sortOrder);
  }

  onFileSelected(event: any, step: number): void {
    if (this.isClientDataMissing) {
      alert('Cannot upload files without valid client data.');
      return;
    }

    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const allowedTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'];

      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Only .doc, .docx, and .pdf are allowed.');
        return;
      }

      this.fileName = file.name;
      this.fileSize = this.formatFileSize(file.size);
      this.uploadProgress = 0;
      this.isUploading = true;

      if (step === 0) {
        this.uploadContractToBackend(file, step);
      } else if (step === 1) {
        this.uploadFinalContractToBackend(file);
      } else if (step === 2) {
        this.uploadInvoice(file);
      }

      fileInput.value = '';
    }
    console.log('File selected in step:', step, event.target.files[0]);
  }

  uploadContractToBackend(file: File, step: number) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', this.selectedClient.client_id);
    formData.append('username', this.selectedClient.username);

    this.uploadProgress = 0;
    this.isUploading = true;

    this.http.post(`${this.apiBaseUrl}/upload-contract`, formData, {
      headers: new HttpHeaders({ 'ngrok-skip-browser-warning': '69420' })
    }).subscribe(
      (response: any) => {
        this.isUploading = false;
        this.uploadProgress = 100;

        const uploadedFile: UploadedFile = {
          name: file.name,
          size: this.formatFileSize(file.size),
          type: this.getFileType(file.name),
          date: new Date().toLocaleString(),
          url: response.url || URL.createObjectURL(file),
          uploadedBy: 'client',
          status: 'Pending',
          amount: 0,
          plan: 'Basic'
        };

        if (step === 0) {
          this.uploadedDraftFiles.unshift(uploadedFile);
          this.sortFiles();
          this.filterFiles();
        }

        this.cdr.detectChanges();
        console.log(`File uploaded to backend: ${file.name}`);
      },
      error => {
        console.error('Error uploading file to backend:', error);
        this.isUploading = false;
        this.uploadProgress = 0;
      }
    );

    const interval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += 10;
      } else {
        clearInterval(interval);
      }
    }, 500);
  }

  async uploadFinalContractToBackend(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', this.selectedClient.client_id);
    formData.append('username', this.selectedClient.username);

    try {
      const response = await this.http.post<{ message: string; filename: string }>(
        `${this.apiBaseUrl}/upload-final-contract`,
        formData,
        {
          headers: new HttpHeaders({ 'ngrok-skip-browser-warning': '69420' }),
          reportProgress: true,
          observe: 'response'
        }
      ).toPromise();

      if (response?.status !== 200) {
        throw new Error(`Upload failed with status: ${response?.status}`);
      }

      const responseBody = response.body;
      if (responseBody?.message && responseBody?.filename) {
        console.log('Final contract uploaded successfully:', responseBody.filename);
        alert(`Success!\n${responseBody.message}`);

        const uploadedFile: UploadedFile = {
          name: responseBody.filename,
          size: this.formatFileSize(file.size),
          type: this.getFileType(file.name),
          date: new Date().toLocaleString(),
          url: URL.createObjectURL(file),
          uploadedBy: 'client',
          status: 'Pending',
          amount: 0,
          plan: 'Basic'
        };

        this.uploadedFinalContracts.unshift(uploadedFile);
        this.finalContract = uploadedFile;
        this.cdr.detectChanges();

        this.loadClientData(this.selectedClient.client_id);
        return responseBody.filename;
      } else {
        throw new Error('Unexpected response format from the server');
      }
    } catch (err: any) {
      console.error('Final contract upload failed:', err);
      alert(`File upload failed!\nError: ${err.message || err.statusText || 'Unknown error'}`);
      return '';
    }
  }

  async uploadInvoice(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', this.selectedClient.client_id);
    formData.append('username', this.selectedClient.username);
    formData.append('invoice_id', `Invoice#${Date.now()}`);

    try {
      const response = await this.http.post<{ message: string; filename: string }>(
        `${this.apiBaseUrl}/upload-bill`,
        formData,
        {
          headers: new HttpHeaders({ 'ngrok-skip-browser-warning': '69420' }),
          reportProgress: true,
          observe: 'response'
        }
      ).toPromise();

      if (response?.status !== 200) {
        throw new Error(`Upload failed with status: ${response?.status}`);
      }

      const responseBody = response.body;
      if (responseBody?.message && responseBody?.filename) {
        console.log('Invoice uploaded successfully:', responseBody.filename);
        alert(`Success!\n${responseBody.message}`);

        const uploadedFile: UploadedFile = {
          name: responseBody.filename,
          size: this.formatFileSize(file.size),
          type: this.getFileType(file.name),
          date: new Date().toLocaleString(),
          url: URL.createObjectURL(file),
          uploadedBy: 'client',
          status: 'Pending',
          amount: 0,
          plan: 'Basic'
        };

        this.uploadedInvoiceFiles.unshift(uploadedFile);
        this.sortInvoiceFiles();
        this.filterInvoiceFiles();
        this.unpaidInvoices = this.uploadedInvoiceFiles.filter(invoice => invoice.status === 'Pending');
        this.cdr.detectChanges();

        this.loadClientData(this.selectedClient.client_id);
        return responseBody.filename;
      } else {
        throw new Error('Unexpected response format from the server');
      }
    } catch (err: any) {
      console.error('Invoice upload failed:', err);
      alert(`File upload failed!\nError: ${err.message || err.statusText || 'Unknown error'}`);
      return '';
    }
  }

  cancelUpload(): void {
    this.uploadProgress = 0;
    this.fileName = '';
    this.fileSize = '';
    this.isUploading = false;
    this.cdr.detectChanges();
    console.log('Upload canceled');
  }

  filterInvoiceFiles(): void {
    const query = this.invoiceSearchQuery.toLowerCase().trim();
    this.filteredInvoiceFiles = query
      ? this.uploadedInvoiceFiles.filter(invoice =>
          invoice.name.toLowerCase().includes(query) || invoice.date.toLowerCase().includes(query))
      : [...this.uploadedInvoiceFiles];
    console.log('Filtering invoices with query:', this.invoiceSearchQuery);
  }

  sortInvoiceFiles(): void {
    this.uploadedInvoiceFiles.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return this.invoiceSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    this.filterInvoiceFiles();
    console.log('Sorting invoices with order:', this.invoiceSortOrder);
  }

  payInvoice(invoice: UploadedFile): void {
    alert(`Initiating payment for ${invoice.name} - Amount: $${invoice.amount}`);
    console.log('Paying invoice:', invoice);
    invoice.status = 'Paid';
    this.unpaidInvoices = this.uploadedInvoiceFiles.filter(inv => inv.status === 'Pending');
    this.cdr.detectChanges();
  }

  completeProcess(): void {
    alert('Process completed. Thank you!');
    this.router.navigate(['/dashboard']);
    console.log('Process completed');
  }

  downloadFile(file: UploadedFile): void {
    console.log('Downloading file:', file.name, 'with URL:', file.url);
    if (!file.url) {
      const fallbackUrl = `${this.apiBaseUrl}/files/${file.name}`;
      console.warn('Download URL not available. Using fallback URL:', fallbackUrl);
      file.url = fallbackUrl;
    }
    const link = document.createElement('a');
    link.href = file.url;
    link.setAttribute('download', file.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  refreshStepData() {
    if (this.activeStepIndex === 0) {
      this.sortFiles();
      this.filterFiles();
    } else if (this.activeStepIndex === 2) {
      this.sortInvoiceFiles();
      this.filterInvoiceFiles();
    }
    this.cdr.detectChanges();
  }
}