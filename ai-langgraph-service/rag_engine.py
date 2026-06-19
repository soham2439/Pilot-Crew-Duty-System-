import os
import re
import math
from typing import List, Dict, Tuple

# Attempt NLTK imports and check if required corpora are already available
try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    from nltk.stem import WordNetLemmatizer
    
    # Just check if available. If they throw LookupError, we drop to fallback
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
    nltk.data.find('corpora/wordnet')
        
    STOPWORDS = set(stopwords.words('english'))
    LEMMATIZER = WordNetLemmatizer()
    HAS_NLTK = True
except Exception:
    HAS_NLTK = False
    STOPWORDS = {
        "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
        "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", 
        "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", 
        "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", 
        "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", 
        "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", 
        "for", "with", "about", "against", "between", "into", "through", "during", "before", 
        "after", "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", 
        "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", 
        "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", 
        "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", 
        "will", "just", "don", "should", "now"
    }
    LEMMATIZER = None

def preprocess_text(text: str) -> List[str]:
    """Tokenize, lowercase, remove stopwords, and lemmatize text."""
    text = text.lower()
    if HAS_NLTK:
        try:
            tokens = word_tokenize(text)
            cleaned = []
            for t in tokens:
                if t.isalnum() and t not in STOPWORDS:
                    cleaned.append(LEMMATIZER.lemmatize(t))
            return cleaned
        except Exception:
            pass
            
    # Fallback preprocessing
    tokens = re.findall(r'\b\w+\b', text)
    return [t for t in tokens if t not in STOPWORDS]

class SimpleRAG:
    def __init__(self, knowledge_dir: str = None):
        if knowledge_dir is None:
            # Default to the knowledge directory relative to this file
            base_dir = os.path.dirname(os.path.abspath(__file__))
            knowledge_dir = os.path.join(base_dir, "knowledge")
            
        self.chunks: List[str] = []
        self.preprocessed_chunks: List[List[str]] = []
        self.df: Dict[str, int] = {}
        
        self.load_documents(knowledge_dir)
        self.build_index()

    def load_documents(self, knowledge_dir: str):
        """Load markdown or text files from directory and chunk them."""
        if not os.path.exists(knowledge_dir):
            os.makedirs(knowledge_dir, exist_ok=True)
            return

        for filename in os.listdir(knowledge_dir):
            if filename.endswith(".md") or filename.endswith(".txt"):
                filepath = os.path.join(knowledge_dir, filename)
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()
                        # Simple chunking by paragraph or double newlines
                        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
                        for p in paragraphs:
                            # Skip short headers
                            if len(p) > 20:
                                self.chunks.append(p)
                except Exception as e:
                    print(f"Error reading {filename}: {e}")

    def build_index(self):
        """Build a simple TF-IDF index for the loaded chunks."""
        self.preprocessed_chunks = [preprocess_text(c) for c in self.chunks]
        
        # Calculate Doc Frequencies
        for chunk_tokens in self.preprocessed_chunks:
            seen = set(chunk_tokens)
            for token in seen:
                self.df[token] = self.df.get(token, 0) + 1

    def retrieve(self, query: str, top_k: int = 2) -> List[Tuple[str, float]]:
        """Retrieve top_k chunks matching the query using TF-IDF cosine similarity."""
        query_tokens = preprocess_text(query)
        if not query_tokens or not self.chunks:
            return []
            
        # Query term frequencies
        query_tf = {}
        for token in query_tokens:
            query_tf[token] = query_tf.get(token, 0) + 1
            
        # Query TF-IDF vector
        query_vector = {}
        query_norm = 0.0
        num_docs = len(self.chunks)
        
        for token, tf in query_tf.items():
            # Add smoothing to IDF
            idf = math.log((num_docs + 1) / (self.df.get(token, 0) + 1)) + 1
            weight = tf * idf
            query_vector[token] = weight
            query_norm += weight * weight
        query_norm = math.sqrt(query_norm)
        
        if query_norm == 0:
            return []
            
        scores = []
        for i, chunk_tokens in enumerate(self.preprocessed_chunks):
            # Calculate doc vector and dot product
            doc_tf = {}
            for token in chunk_tokens:
                doc_tf[token] = doc_tf.get(token, 0) + 1
                
            dot_product = 0.0
            doc_norm = 0.0
            
            for token, tf in doc_tf.items():
                idf = math.log((num_docs + 1) / (self.df.get(token, 0) + 1)) + 1
                weight = tf * idf
                doc_norm += weight * weight
                if token in query_vector:
                    dot_product += query_vector[token] * weight
                    
            doc_norm = math.sqrt(doc_norm)
            if doc_norm > 0:
                cosine_sim = dot_product / (query_norm * doc_norm)
                scores.append((self.chunks[i], cosine_sim))
            else:
                scores.append((self.chunks[i], 0.0))
                
        # Sort by similarity score descending
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

# Global instance of RAG engine
try:
    rag_engine = SimpleRAG()
except Exception as e:
    print(f"Failed to initialize SimpleRAG: {e}")
    rag_engine = None
