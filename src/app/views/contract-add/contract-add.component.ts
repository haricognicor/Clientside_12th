import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { cilPlus } from '@coreui/icons';
import { Router } from '@angular/router';
import { 
  GridModule,   
  CardModule,   
  ButtonModule, 
  TableModule, 
  AvatarModule, 
  ProgressModule 
} from '@coreui/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// Define the User interface
interface User {
  name: string;
  client_id: string;
  email: string;
  file?: string;
}

@Component({
  selector: 'app-contract-add',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    GridModule,   
    CardModule,   
    ButtonModule,
    TableModule, 
    AvatarModule, 
    ProgressModule,
  ],
  templateUrl: './contract-add.component.html',
  styleUrls: ['./contract-add.component.css']
})
export class ContractAddComponent implements OnInit {
  showUserForm = false;
  uploadedFile: File | null = null;
  icons = { cilPlus };

  // API URLs
  private apiBaseUrl = 'https://add-list-new-client.onrender.com/';
  private addUserApi = `${this.apiBaseUrl}add_client`;
  private createFolderApi = `https://fe36-14-143-149-238.ngrok-free.app/create_folder`;
  private uploadFileApi = `https://fe36-14-143-149-238.ngrok-free.app/upload_proposal/`;
  private getUsersApi = `${this.apiBaseUrl}get_all_clients`;

  users: User[] = [];
  finalContracts: User[] = [];
  generalContracts: User[] = [];

  newUser: User = {
    name: '',
    client_id: '',
    email: '',
    file: ''
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    console.log('Fetching users from:', this.getUsersApi);
    this.http.get<any>(this.getUsersApi, {
      headers: new HttpHeaders({ 'Accept': 'application/json', 'ngrok-skip-browser-warning': "69420" })
    }).subscribe({
      next: (response) => {
        this.users = response.clients || response || [];
        console.log('Fetched Users:', this.users);

        // After fetching users, separate them into final and general contracts
        this.separateContracts();
      },
      error: (error) => {
        console.error('Error fetching users:', error);
        alert(`Failed to fetch clients: ${error.statusText || error.message}`);
      }
    });
  }

  // Method to separate users into final and general contracts
  separateContracts(): void {
    this.finalContracts = this.users.filter(user => user.file && user.file.toLowerCase().includes('final'));
    this.generalContracts = this.users.filter(user => !user.file || !user.file.toLowerCase().includes('final'));
    console.log('Final Contracts:', this.finalContracts);
    console.log('General Contracts:', this.generalContracts);
  }

  toggleUserForm() {
    this.showUserForm = !this.showUserForm;
  }

  onFileSelected(event: any) {
    this.uploadedFile = event.target.files[0] || null;
    console.log('File selected:', this.uploadedFile);
  }

  // File upload logic remains the same
  async uploadProposalFile(): Promise<string> {
    if (!this.uploadedFile) {
      console.warn('⚠️ No file selected for upload.');
      return '';
    }

    const formData = new FormData();
    formData.append('file', this.uploadedFile);
    formData.append('username', this.newUser.name);
    formData.append('client_id', this.newUser.client_id);

    console.log('📤 Uploading file to:', this.uploadFileApi);
    console.log('📂 File Name:', this.uploadedFile.name);
    console.log('🆔 Client ID:', this.newUser.client_id);

    try {
      const response = await this.http.post<{ fileUrl: string }>(
        this.uploadFileApi,
        formData,
        {
          headers: new HttpHeaders({ 'ngrok-skip-browser-warning': "69420" }),
          reportProgress: true,
          observe: 'response'
        }
      ).toPromise();

      if (response?.status !== 200) {
        throw new Error(`❌ Upload failed with status: ${response?.status}`);
      }

      const fileUrl = response.body?.fileUrl;
      if (!fileUrl) {
        throw new Error('❌ File URL not returned from the server');
      }

      console.log('✅ File uploaded successfully:', fileUrl);
      return fileUrl;
    } catch (err: any) {
      console.error('❌ File upload failed:', err);
      alert(`⚠️ File upload failed!\nError: ${err.message || err.statusText || 'Unknown error'}`);
      return '';
    }
  }

  // Method to add a new user
  async addUser() {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      console.log('Adding client:', this.newUser);
      const addResponse = await this.http.post(this.addUserApi, this.newUser, {
        headers: new HttpHeaders({ 'Content-Type': 'application/json;charset=UTF-8' }),
        observe: 'response'
      }).toPromise();

      if (!addResponse || (addResponse.status !== 201 && addResponse.status !== 200)) {
        throw new Error('Failed to add client');
      }
      console.log('✅ Client Added Successfully');

      const formData = new FormData();
      formData.append('username', this.newUser.name);
      formData.append('client_id', this.newUser.client_id);

      const folderResponse = await this.http.post(this.createFolderApi, formData, {
        headers: new HttpHeaders({ 'ngrok-skip-browser-warning': "69420" }),
        observe: 'response'
      }).toPromise();

      if (!folderResponse || (folderResponse.status !== 201 && folderResponse.status !== 200)) {
        throw new Error('Failed to create folder');
      }
      console.log('✅ Folder Created Successfully');

      let fileUrl = '';
      if (this.uploadedFile) {
        console.log('📤 Uploading file for:', this.newUser.name);
        fileUrl = await this.uploadProposalFile();
        if (!fileUrl) {
          throw new Error('File upload failed');
        }
        this.newUser.file = fileUrl;
      }

      this.users.unshift({ ...this.newUser }); // Adds to top of array
      this.separateContracts();  // Re-separate contracts after adding new user
      this.resetForm();
      alert('🎉 New client added successfully!');

    } catch (error: any) {
      console.error('❌ Error:', error);
      alert(`⚠️ An error occurred: ${error.message || 'Please try again.'}`);
    }
  }

  isFormValid(): boolean {
    return !!(this.newUser.name && this.newUser.client_id && this.newUser.email);
  }

  resetForm() {
    this.newUser = { name: '', client_id: '', email: '', file: '' };
    this.uploadedFile = null;
    this.showUserForm = false;
  }

  storeClientData(user: any): void {
    sessionStorage.setItem('selectedClient', JSON.stringify({
      username: user.name,
      client_id: user.client_id
    }));
    this.router.navigate(['/tasks']);
  }

  viewContract(user: User) {
    if (user.file) {
      window.open(user.file, '_blank');
    } else {
      alert(`No document available for ${user.name}`);
    }
  }
}
