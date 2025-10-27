import React, { useState } from 'react';
import { useToast } from './ToastProvider';

const API_URL = 'http://localhost:5001/api';

const AISparqlTool = () => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [diagnosticPreds, setDiagnosticPreds] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const toast = useToast();

  const handleGenerate = async () => {
    if (!question.trim()) {
      toast.error('Veuillez saisir une question en langage naturel.');
      return;
    }

  setLoading(true);
    setResults([]);
    setExplanation('');

    try {
      const resp = await fetch(`${API_URL}/ai/natural-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        const errMsg = data.error || 'Erreur lors de la génération.';
        toast.error(errMsg);
        // Do not expose raw AI output or SPARQL to the end user UI.
        // Surface diagnostic predicates and a friendly message instead.
        if (data.diagnosticPredicates) setDiagnosticPreds(data.diagnosticPredicates || []);
        setUserMessage(data.userMessage || 'Une erreur est survenue lors de la génération de la requête.');
        setLoading(false);
        return;
      }
    setResults(data.results || []);
    setExplanation(data.explanation || '');
    setUserMessage(data.userMessage || '');

      // Friendly summary for users
      const resData = data.results || [];
      // If aggregate/count-style response: try to extract numeric value
      let friendly = null;
      if (resData.length === 1) {
        const keys = Object.keys(resData[0]);
        if (keys.length === 1) {
          const v = resData[0][keys[0]];
          if (v && /^\d+$/.test(String(v))) {
            friendly = `Résultat : ${v} ${keys[0].toLowerCase().includes('station') ? 'stations' : ''}`;
          }
        }
      }

      // handle empty binding like [{}]
      if ((resData.length === 0) || (resData.length === 1 && Object.keys(resData[0]).length === 0)) {
        // show diagnostic suggestions if available
        if (data.diagnosticPredicates && data.diagnosticPredicates.length > 0) {
          toast.info('La requête n\'a retourné aucun résultat — suggestions de propriétés trouvées dans le dataset.');
        } else {
          toast.info('La requête n\'a retourné aucun résultat.');
        }
      } else if (friendly) {
        toast.success(friendly);
      } else {
        toast.success(`Requête générée (${data.count || resData.length} résultats)`);
      }
      // store diagnostic preds for UI
      if (data.diagnosticPredicates) setDiagnosticPreds(data.diagnosticPredicates || []);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l’appel à l’IA');
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div className="ai-sparql-tool">
      <h3>Assistant Smart City</h3>
      <p style={{ marginTop: 6, marginBottom: 12, color: '#555' }}>Posez votre question en français — je vais chercher les informations et répondre simplement.</p>
      <textarea
        placeholder="Pose ta question (ex : 'Quels sont les événements récents ?')"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={3}
        style={{ width: '100%', padding: 10, borderRadius: 8 }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Génération…' : 'Générer et exécuter'}
        </button>
        <button className="btn btn-secondary" onClick={() => { setQuestion(''); setGeneratedQuery(''); setResults([]); setExplanation(''); setUserMessage(''); }}>
          Réinitialiser
        </button>
      </div>

      

        {/** server-side userMessage (friendly) **/}
        {/** We'll display it if present in the latest response stored via explanation or results */}
        {/** To keep state simple, show `explanation` first; the backend also returns `userMessage` which we can show below if present. **/}
        {/** We need to show data.userMessage — but we don't have it in state separately; store it when setting results. **/}

      {diagnosticPreds && diagnosticPreds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <strong>Suggestions (propriétés fréquentes pour l'entité détectée)</strong>
          <ul>
            {diagnosticPreds.map((d, i) => (
              <li key={i}><code>{d.predicate}</code> — {d.count} occurrences</li>
            ))}
          </ul>
          <p className="small">Si la propriété utilisée par l'IA n'existe pas dans votre dataset, choisissez l'une des propriétés ci-dessus et modifiez la requête SPARQL.</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <strong>Résultats ({results.length})</strong>
          <div style={{ maxHeight: 260, overflow: 'auto', marginTop: 8 }}>
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(results[0]).map(k => <th key={k}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i}>
                    {Object.keys(results[0]).map(k => <td key={k}>{row[k] || ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISparqlTool;
