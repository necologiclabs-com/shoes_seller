import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export const useProducts = (nextToken?: string, limit?: number) => {
    return useQuery({
        queryKey: ['products', nextToken, limit],
        queryFn: () => apiClient.getProducts(nextToken, limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useAllProducts = () => {
    return useQuery({
        queryKey: ['all-products'],
        queryFn: () => apiClient.getAllProducts(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useProductDetail = (productId: string) => {
    return useQuery({
        queryKey: ['product', productId],
        queryFn: () => apiClient.getProductDetail(productId),
        enabled: !!productId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const usePrices = (productId: string) => {
    return useQuery({
        queryKey: ['prices', productId],
        queryFn: () => apiClient.getPrices(productId),
        enabled: !!productId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    });
};
