import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-questionnaire',
  standalone: true,
  templateUrl: './questionnaire.component.html',
  styleUrls: ['./questionnaire.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ]
})
export class QuestionnaireComponent implements OnInit {
  private apiBaseUrl = 'https://fe36-14-143-149-238.ngrok-free.app'; // Using the proxied path to avoid CORS issues
  clientId!: string;
  questions: { question_id: string; text: string; answer: string | null; readonly?: boolean }[] = [];
  loading: boolean = false;
  errorMessage: string = '';
  allAnswered: boolean = false;

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.clientId = params['clientId'] || '0001';
      this.fetchQuestions();
    });
  }

  fetchQuestions() {
    this.loading = true;
    this.errorMessage = '';
    console.log('Fetching questions for clientId:', this.clientId);

    // Define headers to bypass ngrok warning and ensure JSON response
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': '69420'
    });

    // Use the correct endpoint: /fetch_qa/{clientId}
    this.http.get(`${this.apiBaseUrl}/fetch_qa/${this.clientId}`, { 
      headers: headers, 
      responseType: 'text' 
    }).subscribe(
      (response: string) => {
        console.log('Raw server response:', response);

        try {
          const data = JSON.parse(response);
          // Map the responses array to the questions format
          this.questions = data.responses.map((q: any) => ({
            question_id: q.question_id.toString(), // Ensure question_id is a string
            text: q.question,
            answer: q.answer || null, // Use existing answer if available
            readonly: false // Allow editing of all answers
          }));
          this.checkAllAnswered();
          this.loading = false;
        } catch (error) {
          console.error('Failed to parse response as JSON:', error);
          this.errorMessage = '⚠️ Invalid response format from server.';
          this.loading = false;
        }
      },
      error => {
        console.error('Error fetching questions:', error);
        this.errorMessage = '⚠️ Failed to load questions: ' + (error.message || 'Unknown error');
        this.loading = false;
      }
    );
  }

  onAnswerChange() {
    this.checkAllAnswered();
  }

  checkAllAnswered() {
    this.allAnswered = this.questions.length > 0 && this.questions.every(q => q.answer && q.answer.trim().length > 0);
  }

  submitAnswers() {
    if (!this.allAnswered) {
      this.errorMessage = '⚠️ Please answer all questions before submitting.';
      return;
    }

    this.submitResponses();
  }

  submitResponses() {
    const payloadData = {
      client_id: '0001',
      responses: this.questions.map(q => ({
        question_id: q.question_id,
        answer: q.answer || 'No answer provided'
      }))
    };

    // Convert the payload to FormData
    const formData = new FormData();
    formData.append('client_id', payloadData.client_id);
    formData.append('responses', JSON.stringify(payloadData.responses));

    this.loading = true;
    this.errorMessage = '';

    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': '69420'
    });

    this.http.post(`${this.apiBaseUrl}/submit_response`, formData, { headers }).subscribe(
      (response: any) => {
        this.loading = false;
        this.errorMessage = '✅ ' + response.message;
        this.questions = this.questions.map(q => ({ ...q, readonly: true }));
        console.log('Submit response:', response);
      },
      error => {
        console.error('Error submitting answers:', error);
        console.log('Error details:', error.error?.detail);
        this.errorMessage = '⚠️ Failed to submit answers: ' + (error.error?.detail || error.message || 'Unknown error');
        this.loading = false;
      }
    );
  }
  trackByQuestion(index: number, question: any): string {
    return question.question_id;
  }
}

function submitResponses() {
  throw new Error('Function not implemented.');
}
