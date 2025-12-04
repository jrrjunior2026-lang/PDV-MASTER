import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import { ProductForm } from './ProductForm';

// Mock do Button component
vi.mock('../UI', () => ({
  Button: ({ children, onClick, disabled, type = 'button' }: any) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  )
}));

describe('ProductForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all required form fields', () => {
    render(<ProductForm {...defaultProps} />);

    expect(screen.getByLabelText(/Nome do Produto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Código\/EAN/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preço de Venda/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Custo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estoque Atual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estoque Mínimo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Unidade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Categoria/i)).toBeInTheDocument();
  });

  it('should show validation errors for required fields', async () => {
    render(<ProductForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /salvar produto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Nome deve ter pelo menos 2 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/Código é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/Preço deve ser maior que zero/i)).toBeInTheDocument();
      expect(screen.getByText(/Estoque deve ser um número inteiro/i)).toBeInTheDocument();
    });
  });

  it('should call onSubmit with valid form data', async () => {
    render(<ProductForm {...defaultProps} />);

    // Preencher campos obrigatórios
    fireEvent.change(screen.getByLabelText(/Nome do Produto/i), {
      target: { value: 'Produto Teste' }
    });

    fireEvent.change(screen.getByLabelText(/Código\/EAN/i), {
      target: { value: 'PROD001' }
    });

    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), {
      target: { value: '29.99' }
    });

    fireEvent.change(screen.getByLabelText(/Estoque Atual/i), {
      target: { value: '100' }
    });

    fireEvent.change(screen.getByLabelText(/Estoque Mínimo/i), {
      target: { value: '10' }
    });

    const unitSelect = screen.getByLabelText(/Unidade/i);
    fireEvent.change(unitSelect, {
      target: { value: 'UN' }
    });

    // Submeter formulário
    const submitButton = screen.getByRole('button', { name: /salvar produto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Produto Teste',
        code: 'PROD001',
        price: 29.99,
        cost: undefined,
        stock: 100,
        minStock: 10,
        unit: 'UN',
        category: ''
      });
    });
  });

  it('should validate product code format', async () => {
    render(<ProductForm {...defaultProps} />);

    const codeInput = screen.getByLabelText(/Código\/EAN/i);

    // Código inválido com caracteres especiais não permitidos
    fireEvent.change(codeInput, {
      target: { value: 'PROD@001' }
    });

    // Preencher outros campos para evitar outros erros
    fireEvent.change(screen.getByLabelText(/Nome do Produto/i), {
      target: { value: 'Produto Teste' }
    });
    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), {
      target: { value: '29.99' }
    });
    fireEvent.change(screen.getByLabelText(/Estoque Atual/i), {
      target: { value: '100' }
    });
    fireEvent.change(screen.getByLabelText(/Estoque Mínimo/i), {
      target: { value: '10' }
    });
    const unitSelect = screen.getByLabelText(/Unidade/i);
    fireEvent.change(unitSelect, { target: { value: 'UN' } });

    const submitButton = screen.getByRole('button', { name: /salvar produto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Código deve conter apenas letras maiúsculas, números, hífen ou underscore/i)).toBeInTheDocument();
    });
  });

  it('should convert product code to uppercase', () => {
    render(<ProductForm {...defaultProps} />);

    const codeInput = screen.getByLabelText(/Código\/EAN/i);
    fireEvent.change(codeInput, {
      target: { value: 'prod001' }
    });

    expect(codeInput).toHaveValue('PROD001');
  });

  it('should validate price range', async () => {
    render(<ProductForm {...defaultProps} />);

    // Preencher campos obrigatórios com preço negativo
    fireEvent.change(screen.getByLabelText(/Nome do Produto/i), {
      target: { value: 'Produto Teste' }
    });

    fireEvent.change(screen.getByLabelText(/Código\/EAN/i), {
      target: { value: 'PROD001' }
    });

    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), {
      target: { value: '-10' }
    });

    fireEvent.change(screen.getByLabelText(/Estoque Atual/i), {
      target: { value: '100' }
    });

    fireEvent.change(screen.getByLabelText(/Estoque Mínimo/i), {
      target: { value: '10' }
    });

    const unitSelect = screen.getByLabelText(/Unidade/i);
    fireEvent.change(unitSelect, { target: { value: 'UN' } });

    const submitButton = screen.getByRole('button', { name: /salvar produto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Preço deve ser maior que zero/i)).toBeInTheDocument();
    });
  });

  it('should validate stock constraints', async () => {
    render(<ProductForm {...defaultProps} />);

    // Preencher campos obrigatórios com estoque negativo
    fireEvent.change(screen.getByLabelText(/Nome do Produto/i), {
      target: { value: 'Produto Teste' }
    });

    fireEvent.change(screen.getByLabelText(/Código\/EAN/i), {
      target: { value: 'PROD001' }
    });

    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), {
      target: { value: '29.99' }
    });

    fireEvent.change(screen.getByLabelText(/Estoque Atual/i), {
      target: { value: '-10' }
    });

    fireEvent.change(screen.getByLabelText(/Estoque Mínimo/i), {
      target: { value: '10' }
    });

    const unitSelect = screen.getByLabelText(/Unidade/i);
    fireEvent.change(unitSelect, { target: { value: 'UN' } });

    const submitButton = screen.getByRole('button', { name: /salvar produto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Estoque não pode ser negativo/i)).toBeInTheDocument();
    });
  });

  it('should validate decimal input for prices', () => {
    render(<ProductForm {...defaultProps} />);

    const priceInput = screen.getByLabelText(/Preço de Venda/i);

    // Teste entrada decimal
    fireEvent.change(priceInput, {
      target: { value: '29.99' }
    });

    expect(priceInput).toHaveValue('29.99');

    // Teste conversão automática (entrada deve ser tratada no submit)
    fireEvent.change(priceInput, {
      target: { value: '29,99' }
    });

    // O valor permanece como string até o submit, onde será convertido
    expect(priceInput).toHaveValue('29,99');
  });

  it('should validate name length constraints', async () => {
    render(<ProductForm {...defaultProps} />);

    // Nome muito curto
    fireEvent.change(screen.getByLabelText(/Nome do Produto/i), {
      target: { value: 'A' }
    });

    // Preencher outros campos para testar apenas erro de nome
    fireEvent.change(screen.getByLabelText(/Código\/EAN/i), {
      target: { value: 'PROD001' }
    });
    fireEvent.change(screen.getByLabelText(/Preço de Venda/i), {
      target: { value: '29.99' }
    });
    fireEvent.change(screen.getByLabelText(/Estoque Atual/i), {
      target: { value: '100' }
    });
    fireEvent.change(screen.getByLabelText(/Estoque Mínimo/i), {
      target: { value: '10' }
    });
    const unitSelect = screen.getByLabelText(/Unidade/i);
    fireEvent.change(unitSelect, { target: { value: 'UN' } });

    const submitButton = screen.getByRole('button', { name: /salvar produto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Nome deve ter pelo menos 2 caracteres/i)).toBeInTheDocument();
    });
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(<ProductForm {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should disable submit button when loading', () => {
    render(<ProductForm {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /salvando/i });
    expect(submitButton).toBeDisabled();
  });

  it('should fill form with initial data', () => {
    const initialData = {
      name: 'Produto Inicial',
      code: 'INIT001',
      price: 19.99,
      stock: 50,
      minStock: 5
    };

    render(<ProductForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByLabelText(/Nome do Produto/i)).toHaveValue('Produto Inicial');
    expect(screen.getByLabelText(/Código\/EAN/i)).toHaveValue('INIT001');
    expect(screen.getByLabelText(/Preço de Venda/i)).toHaveValue('19.99');
    expect(screen.getByLabelText(/Estoque Atual/i)).toHaveValue('50');
    expect(screen.getByLabelText(/Estoque Mínimo/i)).toHaveValue('5');
  });

  it('should clear validation errors when user starts typing', async () => {
    render(<ProductForm {...defaultProps} />);

    // Primeiro mostrar erro
    const submitButton = screen.getByRole('button', { name: /salvar produto/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Nome deve ter pelo menos 2 caracteres/i)).toBeInTheDocument();
    });

    // Agora começar a digitar no campo com erro
    const nameInput = screen.getByLabelText(/Nome do Produto/i);
    fireEvent.change(nameInput, {
      target: { value: 'Novo produto' }
    });

    // Erro deve desaparecer
    expect(screen.queryByText(/Nome deve ter pelo menos 2 caracteres/i)).not.toBeInTheDocument();
  });
});
