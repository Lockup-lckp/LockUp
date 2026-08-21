import React from 'react';

// Endereço que não corresponde a nenhuma instituição ativa.
//
// Estava escrito dentro da tela de login, com as cores cravadas em branco e
// cinza. Isso funcionava enquanto o sistema inteiro era navy: agora que a
// escola escolhe o fundo, texto branco fixo desaparece num portal de fundo
// claro — e a tela de erro é justamente onde não se pode depender de sorte.
//
// Aqui as cores vêm de token. Sem escola resolvida não há tema aplicado, então
// valem os tokens da marca LCKP do index.css, que é o certo: o endereço não
// pertence a instituição nenhuma.

export default function EscolaNaoEncontrada({ codigo }) {
    return (
        <div
            role="alert"
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '24px',
                background: 'var(--bg-color)',
                color: 'var(--on-bg)'
            }}
        >
            <p style={{
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: '3.5rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: 'var(--primary-color)',
                margin: '0 0 0.5rem'
            }}>
                404
            </p>

            <h1 style={{
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: '1.375rem',
                fontWeight: 700,
                margin: '0 0 0.75rem'
            }}>
                Instituição não encontrada
            </h1>

            <p style={{
                color: 'var(--on-bg-muted)',
                maxWidth: '30rem',
                lineHeight: 1.6,
                margin: 0
            }}>
                O endereço {codigo ? <strong>{codigo}</strong> : 'informado'} não corresponde a
                nenhuma escola ativa no sistema. Confira o link que a sua instituição divulgou.
            </p>
        </div>
    );
}
